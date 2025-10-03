import { runGoose } from "./goose-runner";
import { systemPrompt } from "./system-prompt";
import { GooseError } from "./types";

async function main() {
  for (let i = 0; ; i++) {
    console.log("Bot loop", i);
    await step();
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}
async function step() {
  try {
    console.log("Checking if a trade is open");
    // 1. check if there are any open trades
    const hasCurrentTradeResult = await runGoose(
      `If I have a LNMarkets trade open, output only EXACTLY "yes", otherwise EXACTLY "no".`
    );
    const hasCurrentTradeText = hasCurrentTradeResult
      .split("\n")
      .filter((l) => l)
      .filter((_, i, a) => i === a.length - 1)[0]
      ?.trim()
      .toLowerCase();

    if (hasCurrentTradeText === "yes") {
      console.log("I already have an open trade open. Try again later");
      return;
    }
    if (hasCurrentTradeText !== "no") {
      console.log(
        "Unknown response when checking for an open trade. Try again later",
        hasCurrentTradeText
      );
      return;
    }

    // check if there is a last trade in the memory
    const closedTradeResult = await runGoose(
      `find memory LAST_POSITION_ID. If there is such a memory, lookup the closed trade on LNMarkets by this ID, and then log the details. Once done, forget LAST_POSITION_ID.`
    );
    console.log("Closed trade result: " + closedTradeResult);

    if (closedTradeResult.includes("Leverage")) {
      console.log("Posting a nostr note about the closed trade");
      const postClosedTradeResult = await runGoose(
        `Post a Nostr note that your trade has been closed, including in the note the **Entry Price**: XX USD, **Exit Price**: XX USD, **Profit/Loss**: XX sats, **Quantity**: XX USD, **Liquidation**: XX USD, **Side**: LONG|SHORT, **Leverage**: XXx, **Entry Time**: (UTC TIME), **Exit Time**: (UTC TIME). (and after the content make a unique optimistic statement that this time you are sure you will win). The raw data to look at for your post is here (DO not post markdown): ${closedTradeResult}`,
        systemPrompt
      );
      console.log("Post closed trade result:", postClosedTradeResult);
      const setProfileResult = await runGoose(
        `Set my nostr profile picture metadata to https://rektbot9000.albylabs.com/mood/XX.jpg where XX is 1,2,3,4 according to the trade result profit/loss where 1 is the worst loss and 4 the best profit: ${closedTradeResult}`,
        systemPrompt
      );
      console.log("Post closed trade result:", postClosedTradeResult);

    } else {
      console.log("Looks like there was no previous trade saved to my memory");
    }

    console.log("Getting wallet balance");
    const balanceResult = await runGoose(
      `What's my combined lightning wallet and LNMarkets balance? only output the combined amount in this EXACT format: "My balance is 1000 sats"`
    );
    const balanceText = balanceResult
      .split("\n")
      .filter((l) => l)
      .filter((_, i, a) => i === a.length - 1)[0]
      ?.trim();
    console.log("Balance:", balanceText);

    console.log("Posting balance to nostr");
    const postBalanceResult = await runGoose(
      `Post the following Nostr note: "${balanceText}"`
    );
    console.log("Post balance result:", postBalanceResult);

    console.log("Possibly topping up the LNMarkets balance");
    const topUpLnmarketsResult = await runGoose(
      `check my LNMarkets balance. If the balance is below 3000 sats, top it up 1000 sats by paying the deposit invoice with my lightning wallet`
    );
    console.log("Top up LNMarkets balance result:", topUpLnmarketsResult);

    // TODO: add some random "mood" for the bot for this trade
    // TODO: read market sentiment and output bullish or bearish

    console.log("Checking market sentiment");
    const marketSentimentResult = await runGoose(
      `Look at the LNMarkets trading data for the last 15 minutes and analyze if it is bullish or bearish. Output only EXACTLY either "bullish" or "bearish".`
    );
    console.log("Market sentiment result:", marketSentimentResult);

    const marketSentimentText = marketSentimentResult
      .split("\n")
      .filter((l) => l)
      .filter((_, i, a) => i === a.length - 1)[0]
      ?.trim()
      .toLowerCase();

    if (
      marketSentimentText !== "bullish" &&
      marketSentimentText !== "bearish"
    ) {
      console.error("Unknown market sentiment", marketSentimentText);
      return;
    }
    const direction = marketSentimentText === "bullish" ? "long" : "short";
    console.log("Opening a new trade", marketSentimentText, direction);

    const openNewTradeResult = await runGoose(
      `open a 50x ${direction} on LNMarkets with quantity 1 and a stop loss 0.1% lower than the current price and a take profit 0.1% higher than the current price. Make sure to remember the **Position ID** as the LAST_POSITION_ID. In the output, display the following information: **Position ID**, **Entry Price**, **Quantity (USD)**, **Liquidation**, **Side**, **Leverage**`
    );
    console.log("Open new trade result:", openNewTradeResult);

    if (openNewTradeResult.indexOf("**Leverage**:") < 0) {
      console.error("Failed to open new trade. Please try again");
      return;
    }

    console.log("Posting a nostr note about the new trade");
    const postOpenTradeResult = await runGoose(
      `Post a Nostr note that you have opened a new trade, including in the note the **Entry Price**: XX USD, **Quantity**: XX USD, **Liquidation**: XX USD, **Side**: LONG|SHORT, **Leverage**: XX USD. (and after the content make a unique optimistic statement that this time you are sure you will win). The raw data to look at for your post is here (DO not post markdown): ${openNewTradeResult}`,
      systemPrompt
    );
    console.log("Post new open trade result:", postOpenTradeResult);
  } catch (error) {
    if (error instanceof GooseError) {
      console.error("Goose Error:", error.message);
      console.error("Exit code:", error.exitCode);
      console.error("Stderr:", error.stderr);
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

main().catch(console.error);

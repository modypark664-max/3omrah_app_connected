import { I18nManager } from "react-native";

export function enforceLTR() {
  try {
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      I18nManager.swapLeftAndRightInRTL(false);
      console.log("📌 LTR enforced. Restart app required.");
    }
  } catch (e) {
    console.warn("Failed to enforce LTR", e);
  }
}

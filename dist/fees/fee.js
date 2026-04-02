export function calcPlatformFeeCents(input) {
    const feePercent = input.feePercent ?? 10.0;
    // Round to nearest rupee/cents unit in MVP.
    // fee = jobAmount * percent / 100
    return Math.round((input.jobAmountCashCents * feePercent) / 100.0);
}
// Generates UPI deeplink that worker can open in their UPI app.
// Example: upi://pay?pa=xxx@upi&pn=UberHelper&am=10.00&cu=INR&tn=Fee&tr=TX123&mc=0000&mode=02
export function generateUpiPayLink(input) {
    const amountRupees = (input.amountCents / 100.0).toFixed(2);
    const currency = input.currency ?? "INR";
    const params = new URLSearchParams();
    params.set("pa", input.payeeUpiId);
    params.set("pn", input.payeeName);
    params.set("am", amountRupees);
    params.set("cu", currency);
    params.set("tn", input.note ?? "UberHelper fee");
    params.set("tr", input.transactionRef);
    // mode=02 => merchant app / intent. Works for many UPI apps.
    params.set("mode", "02");
    return `upi://pay?${params.toString()}`;
}

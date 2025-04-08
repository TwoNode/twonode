const Paystack = require("@paystack/paystack-sdk");

const paystack = new Paystack(process.env.PAYSTACK_SECRET);

const addBaseUrl = (url: string) => process.env.BASE_URL + url;

export const initializePaystack = async ({
  email,
  amount,
  reference,
}: {
  email: string;
  amount: number;
  reference: string;
}) => {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount,
      reference,
      callback_url: addBaseUrl(
        process.env.PAYSTACK_CALLBACK_URL || "/reva/viewdetails"
      ),
    });
    console.log(process.env.PAYSTACK_CALLBACK_URL);
    return response;
  } catch (error) {
    console.error("Error initializing Paystack:", error);
    throw error;
  }
};

export const verifyPaystackTransaction = async (reference: string) => {
  try {
    const response = await paystack.transaction.verify(reference);
    return response;
  } catch (error) {
    console.error("Error verifying Paystack transaction:", error);
    throw error;
  }
};

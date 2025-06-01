import { toast } from "react-toastify";
// import { toast } from "sonner";

export const notifyError = (msg: string) => toast.error(msg);
export const notifySuccess = (msg: string) => toast.success(msg);
export const notifyWarning = (msg: string) => toast.warn(msg);
export const notifyInfo = (msg: string) => toast.info(msg);

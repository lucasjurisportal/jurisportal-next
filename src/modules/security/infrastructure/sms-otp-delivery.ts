/**
 * Porta preparada para SMS. Não existe fornecedor contratado na v27.
 * Quando houver provedor, ele deverá implementar a mesma responsabilidade:
 * receber telefone + código e devolver um id de entrega.
 */
export async function sendOtpSms(): Promise<never> {
  throw new Error("SMS_OTP_NOT_CONFIGURED");
}

let _swal: any;
const getSwal = async () => {
  if (!_swal) {
    _swal = (await import('sweetalert')).default;
  }
  return _swal;
};

export const onErrorMessage = async (message: string, e?: unknown) => {
  try {
    const swal = await getSwal();
    swal("Opps", message, "error");
  // eslint-disable-next-line no-empty
  } catch {
  }
  if (e) console.error(e);
};

export const onConfirm = async (message: string): Promise<boolean> => {
  try {
    const swal = await getSwal();
    return await swal({
      text: message,
      icon: "info",
      dangerMode: true,
      buttons: [true, true],
    });
  } catch (e) {
    console.error(e);
    return confirm(message);
  }
};

export const onSuccess = async (message: string) => {
  try {
    const swal = await getSwal();
    swal("Good job!", message, "success");
  // eslint-disable-next-line no-empty
  } catch {
  }
};

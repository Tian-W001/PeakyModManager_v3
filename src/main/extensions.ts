const installExtensions = async () => {
  const installer = await import("electron-devtools-installer");
  const extensions = ["REACT_DEVELOPER_TOOLS", "REDUX_DEVTOOLS"];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  return installer
    .default(
      extensions.map((name) => installer[name]),
      { forceDownload }
    )
    .catch(console.log);
};

export default installExtensions;

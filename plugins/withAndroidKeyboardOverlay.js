const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

/**
 * android:windowSoftInputMode=adjustNothing — el teclado se dibuja encima de la ventana
 * sin redimensionarla. El scroll y el padding bajo el contenido (p. ej. al abrir teclado)
 * quedan a cargo de la app.
 * Debe ir último en `plugins` para sobrescribir softwareKeyboardLayoutMode (resize/pan).
 */
module.exports = function withAndroidKeyboardOverlay(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults,
    );
    activity.$["android:windowSoftInputMode"] = "adjustNothing";
    return config;
  });
};

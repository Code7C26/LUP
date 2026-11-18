// Configuración de la app que NO puede ir en app.json porque sale de variables de entorno de EAS
// (así las claves y los archivos de Firebase no se suben a GitHub). Expo lee primero app.json y
// se lo pasa acá como "config"; lo que se devuelve es la configuración final.
//
// Variables de EAS (se cargan con `npx eas-cli@latest env:set`, ver README de la app):
//   GOOGLE_MAPS_API_KEY    clave de Google Maps para Android (sin ella, los mapas cierran la app en el APK)
//   GOOGLE_SERVICES_JSON   archivo google-services.json de Firebase (variable de tipo "file"),
//                          necesario para las notificaciones push en Android
// En la compu (Expo Go) no hacen falta: Expo Go trae su propia clave de mapas.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const claveMapas = process.env.GOOGLE_MAPS_API_KEY;
  // En EAS es la ruta al archivo que se subió; en la compu, si alguien lo dejó en app/ (está en .gitignore)
  const archivoLocal = path.join(__dirname, 'google-services.json');
  const googleServices = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(archivoLocal) ? './google-services.json' : undefined);

  // Avisos en el log del build de Android si falta algo
  if (process.env.EAS_BUILD_PLATFORM === 'android') {
    if (!claveMapas) console.warn('⚠ Falta GOOGLE_MAPS_API_KEY: en este APK los mapas van a cerrar la app.');
    if (!googleServices) console.warn('⚠ Falta GOOGLE_SERVICES_JSON: este APK no va a recibir notificaciones push.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServices ? { googleServicesFile: googleServices } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      // Mapas en Android (react-native-maps): la clave se agrega al AndroidManifest al armar el APK
      ['react-native-maps', { androidGoogleMapsApiKey: claveMapas }],
    ],
  };
};

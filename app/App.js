// App de Lüp: carga las tipografías del mockup, Poppins y DM Sans (paso 34), la sesión (paso 36)
// y muestra la navegación por rol (paso 37).
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

import { ProveedorSesion } from './src/contexto/Sesion';
import Navegacion from './src/navegacion';
import { useTema } from './src/tema';

export default function App() {
  const [fuentesListas] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    DMSans_400Regular, // DM Sans: la letra del mockup para los textos
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const { esOscuro } = useTema();

  if (!fuentesListas) return null;

  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <Navegacion />
      </ProveedorSesion>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

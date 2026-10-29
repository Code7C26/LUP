// App de Lüp: carga la tipografía Poppins (paso 34), la sesión (paso 36)
// y muestra la navegación por rol (paso 37).
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { ProveedorSesion } from './src/contexto/Sesion';
import Navegacion from './src/navegacion';
import { useTema } from './src/tema';

export default function App() {
  const [fuentesListas] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
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

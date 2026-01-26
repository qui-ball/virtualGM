# Virtual GM - Frontend

React + TypeScript + Vite application with Capacitor for iOS and Android mobile deployment.

> **👋 New to mobile development?** Check out [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for a step-by-step guide on coding features and testing on mobile devices.

## Prerequisites

- **Node.js >= 22.0.0** (required for Capacitor 8)
  - This project uses Node.js 24.13.0 (LTS)
  - If using nvm: `nvm install` (will use `.nvmrc` file)
  - Or manually: `nvm install 24.13.0 && nvm use 24.13.0`

## Capacitor Integration

This project uses [Capacitor](https://capacitorjs.com/) to build native iOS and Android apps from the React web application.

### Quick Start

1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync to native platforms:**
   ```bash
   npm run cap:sync
   ```
   This builds the app and syncs the web assets to both iOS and Android projects.

3. **Open in native IDEs:**
   - iOS: `npm run cap:open:ios` (requires macOS with Xcode)
   - Android: `npm run cap:open:android` (requires Android Studio)

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run cap:sync` - Build and sync web assets to native projects
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run cap:copy` - Copy web assets without building
- `npm run cap:update` - Update native dependencies

### Manual Setup Steps

#### For iOS Development (macOS only)

1. **Install Xcode:**
   - Download from the Mac App Store
   - Install Xcode Command Line Tools: `xcode-select --install`

2. **Install CocoaPods:**
   ```bash
   sudo gem install cocoapods
   ```

3. **Install iOS dependencies:**
   ```bash
   cd ios/App
   pod install
   ```

4. **Open and build:**
   ```bash
   npm run cap:open:ios
   ```
   Then build and run from Xcode.

#### For Android Development

1. **Install Android Studio:**
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK, SDK Platform, and Android Virtual Device (AVD)

2. **Set up environment variables:**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
   (Add to your `~/.bashrc` or `~/.zshrc`)

3. **Open and build:**
   ```bash
   npm run cap:open:android
   ```
   Then build and run from Android Studio.

### Development Workflow

#### Standard Development Cycle

1. **Make changes to React code** in `src/`
2. **Test in browser:**
   ```bash
   npm run dev
   ```
3. **When ready for mobile testing:**
   ```bash
   npm run build      # Build web assets
   npm run sync       # Sync to native projects (or npm run cap:sync)
   ```
4. **Open in native IDE:**
   ```bash
   npm run open:ios       # Opens in Xcode (or npm run cap:open:ios)
   npm run open:android  # Opens in Android Studio (or npm run cap:open:android)
   ```
5. **Build and run** from the native IDE on device/emulator

#### Quick Reference

- **Build and sync in one command:**
  ```bash
  npm run sync
  ```
  This runs `npm run build` followed by `npx cap sync` automatically.

- **Copy web assets without building:**
  ```bash
  npm run cap:copy
  ```
  Use this when you've already built and just need to copy files.

- **Update native dependencies:**
  ```bash
  npm run cap:update
  ```
  Use this after adding/removing Capacitor plugins.

### Live Reload (Development)

To enable live reload on physical devices during development:

1. Find your local IP address (e.g., `192.168.1.100`)
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:5173',
     cleartext: true, // Required for Android
   }
   ```
3. Run `npm run cap:sync`
4. Start dev server: `npm run dev`
5. Run app on device - changes will reload automatically

**Note:** Remember to remove or comment out the `server` config before production builds!

### Mobile Deployment Testing

#### Prerequisites

Before testing on devices/emulators, ensure you have:

**For iOS:**
- macOS with Xcode installed
- CocoaPods installed (`sudo gem install cocoapods`)
- iOS Simulator or physical iOS device
- Apple Developer account (for physical devices)

**For Android:**
- Android Studio installed
- Android SDK configured
- Android Emulator or physical Android device
- USB debugging enabled (for physical devices)

#### Testing on iOS

1. **Build and sync:**
   ```bash
   npm run sync
   ```

2. **Install iOS dependencies (first time only):**
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```

3. **Open in Xcode:**
   ```bash
   npm run open:ios
   ```

4. **In Xcode:**
   - Select a target device (Simulator or connected device)
   - Click the "Run" button (▶️) or press `Cmd + R`
   - Wait for the app to build and launch

5. **Verify:**
   - App launches without crashes
   - React app UI displays correctly
   - No console errors in Xcode debugger

#### Testing on Android

1. **Build and sync:**
   ```bash
   npm run sync
   ```

2. **Open in Android Studio:**
   ```bash
   npm run open:android
   ```

3. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Select a target device (Emulator or connected device)
   - Click the "Run" button (▶️) or press `Shift + F10`

4. **Verify:**
   - App launches without crashes
   - React app UI displays correctly
   - No errors in Android Studio Logcat

#### Troubleshooting

**iOS Issues:**
- **"CocoaPods not installed"**: Run `sudo gem install cocoapods`
- **"No signing certificate"**: Set up signing in Xcode project settings
- **Build errors**: Clean build folder (`Cmd + Shift + K`) and rebuild

**Android Issues:**
- **Gradle sync fails**: Check Android SDK is properly installed
- **"SDK location not found"**: Set `ANDROID_HOME` environment variable
- **Build errors**: Invalidate caches in Android Studio (File → Invalidate Caches)

**General Issues:**
- **App shows blank screen**: Check that `dist/` folder has content after build
- **Changes not appearing**: Run `npm run sync` after making code changes
- **Connection errors**: Ensure backend is running and accessible from device

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

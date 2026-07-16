This project uses [**Expo**](https://expo.dev) for local development so `npm start` opens the Expo dev server and shows a QR code for Android device testing.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Expo

Start the Expo development server from the project root:

```sh
npm start
```

When Expo starts successfully, it will display a QR code that you can scan from Expo Go.

## Backend Configuration

The app reads its backend URL from `EXPO_PUBLIC_API_URL`.

For this machine it is set in `.env` as:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.28:5000
```

Why this is not `http://localhost:5000` for Expo Go:

- On a physical phone, `localhost` points to the phone itself, not your Node server.
- On Android emulator, use `http://10.0.2.2:5000`.

## Step 2: Run Android

With the Expo server running, open a new terminal and run:

```sh
npm run android
```

If everything is set up correctly, you should see the app running in the Android emulator or on a connected device.

## Step 3: Modify Your App

Open `App.tsx` and make your changes. When you save, the app updates automatically with Fast Refresh.

To force a full reload on Android:

- Press `R` twice.
- Or open the Dev Menu with `Ctrl+M` and choose **Reload**.

# Learn More

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev/docs/getting-started)

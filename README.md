# Dompet Jatah

Local-first Indonesian budgeting app built from the attached MVP requirements.
Wallet and expense data stay in this browser/app on the device; no account or
network connection is needed after the app is installed.

## Run and inspect

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use your browser's responsive/device toolbar to
inspect portrait and landscape mobile layouts.

## Build the Android debug APK

Requires JDK 21 or newer and an Android SDK with API 36/build tools installed.
Set `JAVA_HOME` to that JDK before building if your default Java is older.

```sh
npm run android:apk
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.

The MVP includes a single wallet, daily or monthly allowance, daily spending
breakdown for monthly budgets, editable expenses, a color-and-label calendar,
and basic spending reports. Top-ups, notifications, cloud backup, and device
calendar sync are outside this first build.

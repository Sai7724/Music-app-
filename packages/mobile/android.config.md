# Android Configuration Notes

After running `pnpm cap add android`, make these changes:

## android/app/src/main/AndroidManifest.xml

Add inside `<application>`:
```xml
<!-- Allow HTTP traffic to the stream proxy -->
<application
  android:usesCleartextTraffic="true"
  ...>
```

Add permissions inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<!-- Foreground service for background audio -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
```

## android/app/src/main/res/xml/network_security_config.xml
Create this file:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <!-- Allow HTTP to your Render server if not using HTTPS -->
    <domain includeSubdomains="true">onrender.com</domain>
  </domain-config>
</network-security-config>
```

## Minimum SDK version
In `android/variables.gradle`:
```groovy
minSdkVersion = 24  // Android 7.0
targetSdkVersion = 34
compileSdkVersion = 34
```

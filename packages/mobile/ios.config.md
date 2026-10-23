# iOS Configuration Notes

After running `pnpm cap add ios`, make these changes in Xcode:

## Info.plist additions

Add these keys for audio background playback:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

<!-- Allow HTTP for the stream proxy (or use HTTPS on Render) -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

## Capabilities (in Xcode)
- Background Modes → Audio, AirPlay, and Picture in Picture ✅

## Minimum iOS version
Set to iOS 14.0 in Podfile:
```ruby
platform :ios, '14.0'
```

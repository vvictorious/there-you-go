Pod::Spec.new do |s|
  s.name           = 'ThereYouGoLocationNotification'
  s.version        = '0.1.0'
  s.summary        = 'Schedules iOS location-triggered reminders for ThereYouGo.'
  s.description    = 'A narrow local Expo module for scheduling, inspecting, and cancelling UNLocationNotificationTrigger requests.'
  s.author         = 'Victor Mejia'
  s.homepage       = 'https://github.com/vvictorious/there-you-go'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => 'https://github.com/vvictorious/there-you-go.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"
#import "RCTRootView.h"
#import "RCTBundleURLProvider.h"
#import "RCTLinkingManager.h"
#import "CodePush.h"
#import <Fabric/Fabric.h>
#import <Crashlytics/Crashlytics.h>
#import "QTouchposeApplication.h"
#import "RCTPushNotificationManager.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  NSURL *jsCodeLocation;

  /**
   * Loading JavaScript code - uncomment the one you want.
   *
   * OPTION 1
   * Load from development server. Start the server from the repository root:
   *
   * $ npm start
   *
   * To run on device, change `localhost` to the IP address of your computer
   * (you can get this by typing `ifconfig` into the terminal and selecting the
   * `inet` value under `en0:`) and make sure your computer and iOS device are
   * on the same Wi-Fi network.
   */

#ifdef DEBUG
  // [[RCTBundleURLProvider sharedSettings] setDefaults];
//  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index.ios" fallbackResource:nil];
  jsCodeLocation = [NSURL URLWithString:@"http://192.168.0.101:8081/index.ios.bundle?platform=ios&dev=true"];
//    QTouchposeApplication *touchposeApplication = (QTouchposeApplication *)application;
//    touchposeApplication.alwaysShowTouches = YES;
#else
  jsCodeLocation = [CodePush bundleURL];
    // jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif

  /**
   * OPTION 2
   * Load from pre-bundled file on disk. The static bundle is automatically
   * generated by "Bundle React Native code and images" build step.
   */

  RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
                                                      moduleName:@"Tradle"
                                               initialProperties:nil
                                                   launchOptions:launchOptions];

//  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

#ifdef DEBUG
#else
  [Fabric with:@[[Crashlytics class]]];
#endif

  return YES;
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation {
  return [RCTLinkingManager application:application openURL:url sourceApplication:sourceApplication annotation:annotation];
}

// Required to register for notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
  [RCTPushNotificationManager didRegisterUserNotificationSettings:notificationSettings];
}
// Required for the register event.
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RCTPushNotificationManager didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}
// Required for the notification event.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)notification fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RCTPushNotificationManager didReceiveRemoteNotification:notification];

  // call completionHandler after 20 seconds (30 is max)
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 20 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
    completionHandler(UIBackgroundFetchResultNewData);
  });
}
// Required for the localNotification event.
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [RCTPushNotificationManager didReceiveLocalNotification:notification];
}
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  NSLog(@"%@", error);
}

@end

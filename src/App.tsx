import React, { useEffect, useState } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from './screens/SplashScreen';
import { MeetKairosScreen } from './screens/MeetKairosScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TasksScreen } from './screens/TasksScreen';
import { CompanionScreen } from './screens/CompanionScreen';
import { SquadScreen } from './screens/SquadScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DigitalWellbeingScreen } from './screens/DigitalWellbeingScreen';
import { StatisticsScreen } from './screens/StatisticsScreen';
import { AchievementGallery } from './features/achievements';

export type ScreenState =
  | 'splash'
  | 'meet-kairos'
  | 'auth'
  | 'onboarding'
  | 'home'
  | 'tasks'
  | 'companion'
  | 'squad'
  | 'profile'
  | 'settings'
  | 'wellbeing'
  | 'statistics'
  | 'achievements';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('profile');
  const [userProfile, setUserProfile] = useState<{ email: string; name: string } | null>({
    email: 'alex.rivera@kairos.ai',
    name: 'Alex Rivera'
  });

  useEffect(() => {
    // Configure native status bar for Android / iOS
    try {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FAF8FF' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    } catch {
      // Web preview fallback
    }
  }, []);

  const handleTabNavigation = (tab: string) => {
    if (tab === 'home' || tab === 'SCREEN_22') {
      setCurrentScreen('home');
    } else if (tab === 'tasks' || tab === 'daily-tasks' || tab === 'SCREEN_20') {
      setCurrentScreen('tasks');
    } else if (tab === 'companion' || tab === 'ai-companion-chat' || tab === 'SCREEN_11') {
      setCurrentScreen('companion');
    } else if (tab === 'squad' || tab === 'squad-progression' || tab === 'SCREEN_12') {
      setCurrentScreen('squad');
    } else if (tab === 'profile' || tab === 'evolution-profile' || tab === 'SCREEN_29') {
      setCurrentScreen('profile');
    } else if (tab === 'settings') {
      setCurrentScreen('settings');
    } else if (tab === 'wellbeing' || tab === 'screen-time' || tab === 'digital-wellbeing') {
      setCurrentScreen('wellbeing');
    } else if (tab === 'statistics' || tab === 'stats' || tab === 'analytics' || tab === 'SCREEN_10') {
      setCurrentScreen('statistics');
    } else if (tab === 'achievements' || tab === 'milestones' || tab === 'trophies') {
      setCurrentScreen('achievements');
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-surface overflow-hidden flex flex-col font-body-md text-on-surface antialiased relative">
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={() => setCurrentScreen('meet-kairos')} />
      )}

      {currentScreen === 'meet-kairos' && (
        <MeetKairosScreen onGetStarted={() => setCurrentScreen('auth')} />
      )}

      {currentScreen === 'auth' && (
        <AuthScreen
          onBack={() => setCurrentScreen('meet-kairos')}
          onSuccess={(user) => {
            setUserProfile(user);
            setCurrentScreen('onboarding');
          }}
        />
      )}

      {currentScreen === 'onboarding' && (
        <OnboardingScreen
          onBack={() => setCurrentScreen('auth')}
          onFinish={() => {
            // Completed onboarding -> Navigate to Command Center (Home Screen)
            setCurrentScreen('home');
          }}
        />
      )}

      {currentScreen === 'home' && (
        <HomeScreen
          userProfile={userProfile}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'tasks' && (
        <TasksScreen
          userProfile={userProfile}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'companion' && (
        <CompanionScreen
          userProfile={userProfile}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'squad' && (
        <SquadScreen
          userProfile={userProfile}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileScreen
          userProfile={userProfile}
          onNavigateTab={handleTabNavigation}
          onOpenSettings={() => setCurrentScreen('settings')}
          onOpenWellbeing={() => setCurrentScreen('wellbeing')}
          onOpenStats={() => setCurrentScreen('statistics')}
          onOpenAchievements={() => setCurrentScreen('achievements')}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen
          userProfile={userProfile}
          onBack={() => setCurrentScreen('profile')}
          onNavigateTab={handleTabNavigation}
          onLogOut={() => {
            setUserProfile(null);
            setCurrentScreen('meet-kairos');
          }}
        />
      )}

      {currentScreen === 'wellbeing' && (
        <DigitalWellbeingScreen
          userProfile={userProfile}
          onBack={() => setCurrentScreen('profile')}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'statistics' && (
        <StatisticsScreen
          userProfile={userProfile}
          onBack={() => setCurrentScreen('profile')}
          onNavigateTab={handleTabNavigation}
        />
      )}

      {currentScreen === 'achievements' && (
        <AchievementGallery
          onBack={() => setCurrentScreen('profile')}
        />
      )}
    </div>
  );
}

export default App;



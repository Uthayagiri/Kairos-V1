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
import { NotificationScreen } from './screens/NotificationScreen';
import { ConnectionsScreen } from './screens/ConnectionsScreen';
import { AchievementGallery } from './features/achievements';
import {
  setActiveUserId,
  clearActiveUser
} from './features/storage';
import { progressionManager } from './features/progression/services/progressionManager';
import { squadService } from './features/squad/services/squadService';
import { switchUserFocusSessions, resetFocusSessions } from './features/progression/services/focusSessionService';
import { switchUserTasks, resetUserTasks } from './features/progression/services/taskTimingService';
import { authSession } from './features/auth/authSession';
import { syncManager } from './features/sync/syncManager';

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
  | 'achievements'
  | 'notifications'
  | 'connections';

export const STORAGE_KEY_USER_PROFILE = 'KAIROS_USER_PROFILE_V1';

export function App() {
  const [userProfile, setUserProfile] = useState<{ email: string; name: string } | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
          setActiveUserId(parsed);
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
            return 'home';
          }
        }
      } catch {}
    }
    return 'meet-kairos';
  });

  const [previousScreen, setPreviousScreen] = useState<ScreenState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
            return 'home';
          }
        }
      } catch {}
    }
    return 'meet-kairos';
  });

  const [scannedProfileUser, setScannedProfileUser] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setActiveUserId(userProfile);
      progressionManager.switchUser(userProfile);
      squadService.switchUser(userProfile);
      switchUserFocusSessions(userProfile);
      switchUserTasks(userProfile);
      syncManager.switchUser();
      try {
        localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(userProfile));
      } catch {}
    }
  }, [userProfile]);

  useEffect(() => {
    // Check if there is a profile parameter in the URL (e.g. from Google Lens or external scan)
    const checkUrlProfile = () => {
      try {
        if (typeof window !== 'undefined' && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const profileParam = params.get('profile') || params.get('user') || params.get('scan');
          if (profileParam) {
            setScannedProfileUser(profileParam);
            setCurrentScreen('connections');
          }
        }
      } catch (err) {
        console.warn('URL param error:', err);
      }
    };

    checkUrlProfile();
    window.addEventListener('popstate', checkUrlProfile);
    return () => window.removeEventListener('popstate', checkUrlProfile);
  }, []);

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

  const navigateToScreen = (nextScreen: ScreenState) => {
    if (nextScreen !== 'companion' && currentScreen !== 'companion') {
      setPreviousScreen(currentScreen);
    } else if (currentScreen !== 'companion') {
      setPreviousScreen(currentScreen);
    }
    setCurrentScreen(nextScreen);
  };

  const handleTabNavigation = (tab: string) => {
    if (tab === 'home' || tab === 'SCREEN_22') {
      navigateToScreen('home');
    } else if (tab === 'tasks' || tab === 'daily-tasks' || tab === 'SCREEN_20') {
      navigateToScreen('tasks');
    } else if (tab === 'companion' || tab === 'ai-companion-chat' || tab === 'SCREEN_11') {
      navigateToScreen('companion');
    } else if (tab === 'squad' || tab === 'squad-progression' || tab === 'SCREEN_12') {
      navigateToScreen('squad');
    } else if (tab === 'profile' || tab === 'evolution-profile' || tab === 'SCREEN_29') {
      navigateToScreen('profile');
    } else if (tab === 'settings') {
      navigateToScreen('settings');
    } else if (tab === 'wellbeing' || tab === 'screen-time' || tab === 'digital-wellbeing') {
      navigateToScreen('wellbeing');
    } else if (tab === 'statistics' || tab === 'stats' || tab === 'analytics' || tab === 'SCREEN_10') {
      navigateToScreen('statistics');
    } else if (tab === 'achievements' || tab === 'milestones' || tab === 'trophies') {
      navigateToScreen('achievements');
    } else if (tab === 'notifications' || tab === 'notif' || tab === 'alerts') {
      navigateToScreen('notifications');
    } else if (tab === 'connections' || tab === 'friends' || tab === 'requests' || tab === 'network') {
      navigateToScreen('connections');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] h-[100dvh] bg-slate-950 flex justify-center items-center overflow-hidden select-none">
      <div className="w-full max-w-[430px] h-[100dvh] bg-surface overflow-hidden flex flex-col font-sans text-on-surface antialiased relative sm:shadow-[0_0_50px_rgba(0,0,0,0.4)]">
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
              setActiveUserId(user);
              progressionManager.switchUser(user);
              squadService.switchUser(user);
              switchUserFocusSessions(user);
              switchUserTasks(user);
              setUserProfile(user);
              setCurrentScreen('onboarding');
            }}
          />
        )}

        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            userProfile={userProfile}
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
            onOpenNotifications={() => {
              setPreviousScreen('home');
              setCurrentScreen('notifications');
            }}
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
            onBack={() => setCurrentScreen(previousScreen || 'home')}
          />
        )}

        {currentScreen === 'squad' && (
          <SquadScreen
            userProfile={userProfile}
            onNavigateTab={handleTabNavigation}
            onOpenConnections={() => {
              setPreviousScreen('squad');
              setCurrentScreen('connections');
            }}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            userProfile={userProfile}
            onNavigateTab={handleTabNavigation}
            onOpenSettings={() => {
              setPreviousScreen('profile');
              setCurrentScreen('settings');
            }}
            onOpenWellbeing={() => {
              setPreviousScreen('profile');
              setCurrentScreen('wellbeing');
            }}
            onOpenStats={() => {
              setPreviousScreen('profile');
              setCurrentScreen('statistics');
            }}
            onOpenAchievements={() => {
              setPreviousScreen('profile');
              setCurrentScreen('achievements');
            }}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'profile')}
            onNavigateTab={handleTabNavigation}
            onLogOut={() => {
              progressionManager.resetSession();
              squadService.resetSession();
              resetFocusSessions();
              resetUserTasks();
              authSession.clearSession();
              clearActiveUser();
              syncManager.switchUser();
              try {
                localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
              } catch {}
              setUserProfile(null);
              setCurrentScreen('meet-kairos');
            }}
          />
        )}

        {currentScreen === 'wellbeing' && (
          <DigitalWellbeingScreen
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'profile')}
            onNavigateTab={handleTabNavigation}
          />
        )}

        {currentScreen === 'statistics' && (
          <StatisticsScreen
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'profile')}
            onNavigateTab={handleTabNavigation}
          />
        )}

        {currentScreen === 'achievements' && (
          <AchievementGallery
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'profile')}
          />
        )}

        {currentScreen === 'notifications' && (
          <NotificationScreen
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'home')}
            onNavigateTab={handleTabNavigation}
          />
        )}

        {currentScreen === 'connections' && (
          <ConnectionsScreen
            userProfile={userProfile}
            initialScannedUser={scannedProfileUser}
            onBack={() => {
              setScannedProfileUser(null);
              setCurrentScreen(previousScreen || 'squad');
            }}
            onNavigateTab={handleTabNavigation}
          />
        )}
      </div>
    </div>
  );
}

export default App;



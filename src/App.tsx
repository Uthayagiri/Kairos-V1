import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { authApi } from './features/auth/authApi';
import { AuthStateMachineStatus } from './features/auth/authTypes';
import { syncManager } from './features/sync/syncManager';
import { ErrorBoundary } from './components/ErrorBoundary';

export const STORAGE_KEY_USER_PROFILE = 'KAIROS_USER_PROFILE_V1';

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

export function App() {
  // Authoritative startup visual begins strictly in SplashScreen
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('splash');
  const [previousScreen, setPreviousScreen] = useState<ScreenState>('splash');
  const [authStatus, setAuthStatus] = useState<AuthStateMachineStatus>('BOOTING');

  const [userProfile, setUserProfile] = useState<{
    id?: string;
    email: string;
    name: string;
    onboardingCompleted?: boolean;
    avatarUrl?: string | null;
  } | null>(null);

  const [scannedProfileUser, setScannedProfileUser] = useState<string | null>(null);

  const resolvedDestinationRef = useRef<ScreenState | null>(null);
  const splashCompletedRef = useRef<boolean>(false);

  // Authoritative Startup Flow & Session Restoration
  useEffect(() => {
    setAuthStatus('SPLASH');
    let isMounted = true;

    // Asynchronously restore and validate session state with server
    authApi
      .restoreSession()
      .then((sessionResult) => {
        if (!isMounted) return;

        if (sessionResult && sessionResult.user && sessionResult.onboardingCompleted) {
          const userObj = {
            id: sessionResult.user.id,
            email: sessionResult.user.email,
            name:
              sessionResult.user.profile?.name ||
              sessionResult.user.name ||
              sessionResult.user.email.split('@')[0] ||
              'Kairos Voyager',
            onboardingCompleted: true,
            avatarUrl: sessionResult.user.profile?.avatarUrl ?? null
          };

          setActiveUserId(userObj);
          progressionManager.switchUser(userObj);
          squadService.switchUser(userObj);
          switchUserFocusSessions(userObj);
          switchUserTasks(userObj);
          syncManager.switchUser();
          setUserProfile(userObj);

          // Pull authoritative state (progression, tasks, achievements, profile) from PostgreSQL
          syncManager.pullInitialState().catch(() => {});

          // RETURNING USER: Valid session & completed onboarding -> Home
          setAuthStatus('AUTHENTICATED');
          resolvedDestinationRef.current = 'home';
        } else {
          // NEW / UNAPPROVED / INCOMPLETE USER -> Welcome (meet-kairos)
          authSession.clearSession();
          clearActiveUser();
          setUserProfile(null);
          setAuthStatus('UNAUTHENTICATED');
          resolvedDestinationRef.current = 'meet-kairos';
        }

        // If splash animation already finished, navigate immediately
        if (splashCompletedRef.current && resolvedDestinationRef.current) {
          setCurrentScreen(resolvedDestinationRef.current);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        authSession.clearSession();
        clearActiveUser();
        setUserProfile(null);
        setAuthStatus('UNAUTHENTICATED');
        resolvedDestinationRef.current = 'meet-kairos';

        if (splashCompletedRef.current) {
          setCurrentScreen('meet-kairos');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Global Real-Time User Profile Synchronization Listener
  useEffect(() => {
    const handleProfileUpdate = (event: any) => {
      const user = event?.detail;
      if (user) {
        setUserProfile((prev) => {
          const newName = user.profile?.name || user.name || prev?.name || 'Kairos Voyager';
          const newAvatar = user.profile?.avatarUrl !== undefined ? user.profile.avatarUrl : (user.avatarUrl !== undefined ? user.avatarUrl : prev?.avatarUrl);
          const updated = {
            id: user.id || prev?.id,
            email: user.email || prev?.email || '',
            name: newName,
            onboardingCompleted: true,
            avatarUrl: newAvatar
          };
          setActiveUserId(updated);
          return updated;
        });
      }
    };

    window.addEventListener('kairos_user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('kairos_user_profile_updated', handleProfileUpdate);
    };
  }, []);

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

  const handleSplashComplete = useCallback(() => {
    splashCompletedRef.current = true;
    if (resolvedDestinationRef.current) {
      setCurrentScreen(resolvedDestinationRef.current);
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
        <ErrorBoundary>
          {currentScreen === 'splash' && (
            <SplashScreen onComplete={handleSplashComplete} />
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
                syncManager.switchUser();
                setUserProfile(user);

                // Pull full state from PostgreSQL
                syncManager.pullInitialState().catch(() => {});

                if (user.onboardingCompleted) {
                  setAuthStatus('AUTHENTICATED');
                  setCurrentScreen('home');
                } else {
                  setAuthStatus('AUTHENTICATING');
                  setCurrentScreen('onboarding');
                }
              }}
            />
          )}

          {currentScreen === 'onboarding' && (
            <OnboardingScreen
              userProfile={userProfile}
              onBack={() => setCurrentScreen('auth')}
              onFinish={(updatedUser?: any) => {
                // Completed onboarding -> Mark completed and navigate to Home Screen
                const newName =
                  updatedUser?.name ||
                  updatedUser?.preferredName ||
                  updatedUser?.profile?.name ||
                  userProfile?.name ||
                  'Kairos Voyager';
                const newAvatar =
                  updatedUser?.profile?.avatarUrl ??
                  updatedUser?.avatarUrl ??
                  userProfile?.avatarUrl ??
                  null;

                const updated = {
                  id: updatedUser?.id || userProfile?.id,
                  email: updatedUser?.email || userProfile?.email || '',
                  name: newName,
                  onboardingCompleted: true,
                  avatarUrl: newAvatar
                };

                setUserProfile(updated);
                setActiveUserId(updated);
                setAuthStatus('AUTHENTICATED');
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
                setAuthStatus('LOGGING_OUT');
                authApi.logout();
                progressionManager.resetSession();
                squadService.resetSession();
                resetFocusSessions();
                resetUserTasks();
                authSession.clearSession();
                clearActiveUser();
                syncManager.switchUser();
                setUserProfile(null);
                setAuthStatus('UNAUTHENTICATED');
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
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;




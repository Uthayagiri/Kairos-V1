import { useState, useEffect, useCallback } from 'react';
import { Squad, Challenge, SquadContribution, SquadState } from '../types/squad.types';
import { squadService, TaskContributionInput } from '../services/squadService';
import { formatDateToLocalISO } from '../data/initialSquadData';

export interface UseSquadResult {
  squad: Squad;
  challenges: Challenge[];
  contributions: SquadContribution[];
  state: SquadState;
  recordCheckIn: (
    challengeId: string,
    dateStr?: string,
    hpReward?: number,
    memberId?: string
  ) => { success: boolean; isNew: boolean };
  removeCheckIn: (
    challengeId: string,
    dateStr?: string,
    memberId?: string
  ) => { success: boolean };
  recordTaskContribution: (
    task: TaskContributionInput,
    memberId?: string,
    dateStr?: string
  ) => { affectedChallengeIds: string[] };
  removeTaskContribution: (
    taskId: string,
    memberId?: string,
    dateStr?: string
  ) => { affectedChallengeIds: string[] };
  createChallenge: (
    newChallenge: Challenge
  ) => { success: boolean; error?: string };
  archiveChallenge: (challengeId: string) => { success: boolean };
  getChallengeProgress: (challenge: Challenge) => {
    currentDays: number;
    totalDays: number;
    percentage: number;
  };
}

export function useSquad(): UseSquadResult {
  const [state, setState] = useState<SquadState>(() => squadService.getState());

  useEffect(() => {
    const unsubscribe = squadService.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const recordCheckIn = useCallback(
    (
      challengeId: string,
      dateStr: string = formatDateToLocalISO(),
      hpReward: number = 100,
      memberId?: string
    ) => {
      const res = squadService.recordChallengeCheckIn(challengeId, dateStr, hpReward, memberId);
      return { success: res.success, isNew: res.isNew };
    },
    []
  );

  const removeCheckIn = useCallback(
    (challengeId: string, dateStr: string = formatDateToLocalISO(), memberId?: string) => {
      const res = squadService.removeChallengeCheckIn(challengeId, dateStr, memberId);
      return { success: res.success };
    },
    []
  );

  const recordTaskContribution = useCallback(
    (task: TaskContributionInput, memberId?: string, dateStr?: string) => {
      const res = squadService.recordTaskContribution(task, memberId, dateStr);
      return { affectedChallengeIds: res.affectedChallengeIds };
    },
    []
  );

  const removeTaskContribution = useCallback(
    (taskId: string, memberId?: string, dateStr?: string) => {
      const res = squadService.removeTaskContribution(taskId, memberId, dateStr);
      return { affectedChallengeIds: res.affectedChallengeIds };
    },
    []
  );

  const createChallenge = useCallback((newChallenge: Challenge) => {
    const res = squadService.createChallenge(newChallenge);
    return { success: res.success, error: res.error };
  }, []);

  const archiveChallenge = useCallback((challengeId: string) => {
    const res = squadService.archiveChallenge(challengeId);
    return { success: res.success };
  }, []);

  const getChallengeProgress = useCallback((challenge: Challenge) => {
    return squadService.getChallengeProgress(challenge);
  }, []);

  return {
    squad: state.squad,
    challenges: state.challenges,
    contributions: state.contributions,
    state,
    recordCheckIn,
    removeCheckIn,
    recordTaskContribution,
    removeTaskContribution,
    createChallenge,
    archiveChallenge,
    getChallengeProgress
  };
}

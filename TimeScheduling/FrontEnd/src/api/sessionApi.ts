import { apiClient } from "./apiClient";
import { encodeBitmask } from "../utils/bitmaskUtils";

// API Request/Response Types
export interface MemberCreateRequest {
  name: string;
  role: string;
  isMandatory: boolean;
}

export interface SessionCreateRequest {
  title: string;
  domainType: string;
  candidateDates: string[];
  members: MemberCreateRequest[];
}

export interface SessionCreateResponse {
  sessionId: string;
  adminToken: string;
  expiresAt: string;
}

export interface MemberInfo {
  memberId: number;
  name: string;
  role: string;
  isMandatory: boolean;
  hasSubmitted: boolean;
  availableBitmasks: number[];
}

export interface SessionInfoResponse {
  title: string;
  domainType: string;
  status: "OPEN" | "CONFIRMED";
  candidateDates: string[];
  members: MemberInfo[];
}

export interface RecommendationResponse {
  rank: number;
  recommendationType: string;
  date: string;
  startTime: string;
  endTime: string;
  attendanceRate: number;
  attendees: string[];
}

export interface ConfirmScheduleRequest {
  date: string;
  startSlot: number;
  endSlot: number;
  assignments: Record<number, string>;
}

export interface ConfirmScheduleResponse {
  sessionId: string;
  confirmedDate: string;
  startSlot: number;
  endSlot: number;
}

export interface UpdateAvailabilityRequest {
  availableBitmasks: number[];
}

export interface UpdateAvailabilityResponse {
  memberId: number;
  updatedAt: string;
}

// API Functions
export const sessionApi = {
  createSession: async (data: SessionCreateRequest): Promise<SessionCreateResponse> => {
    const res = await apiClient.post<SessionCreateResponse>("/api/sessions", data);
    return res.data;
  },

  getSession: async (sessionId: string): Promise<SessionInfoResponse> => {
    const res = await apiClient.get<SessionInfoResponse>(`/api/sessions/${sessionId}`);
    return res.data;
  },

  submitAvailability: async (
    sessionId: string,
    memberId: number,
    slots: boolean[][]
  ): Promise<UpdateAvailabilityResponse> => {
    // 2D boolean array -> long[] (number[]) using encodeBitmask
    const availableBitmasks = slots.map((daySlots) => encodeBitmask(daySlots));
    
    const request: UpdateAvailabilityRequest = { availableBitmasks };
    const res = await apiClient.put<UpdateAvailabilityResponse>(
      `/api/sessions/${sessionId}/members/${memberId}/availabilities`,
      request
    );
    return res.data;
  },

  verifyAdmin: async (sessionId: string, adminToken: string) => {
    const res = await apiClient.post<boolean>(`/api/sessions/${sessionId}/verify-admin`, { adminToken });
    return res.data;
  },

  getRecommendations: async (sessionId: string, mandatoryIds?: number[]) => {
    const params = mandatoryIds && mandatoryIds.length > 0 ? { mandatoryIds: mandatoryIds.join(",") } : {};
    const res = await apiClient.get<RecommendationResponse[]>(`/api/sessions/${sessionId}/recommendations`, { params });
    return res.data;
  },

  confirmSchedule: async (sessionId: string, data: ConfirmScheduleRequest): Promise<ConfirmScheduleResponse> => {
    const res = await apiClient.post<ConfirmScheduleResponse>(`/api/sessions/${sessionId}/confirm`, data);
    return res.data;
  },
};

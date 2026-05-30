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
  startDate: string;
  members: MemberCreateRequest[];
  requirementsJson?: string;
}

export interface SessionCreateResponse {
  sessionId: string;
  adminToken: string;
  expiresAt: string;
}

export interface MemberInfo {
  memberId: number;
  participantId?: string;
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
  requirementsJson?: string;
}

export interface TimeBlock {
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  assignedWorkers?: AssigneeDto[];
}

export interface ConfirmedScheduleResponse {
  sessionId: string;
  title: string;
  confirmedBlocks: TimeBlock[];
  version: number;
}

export interface RecommendationResponse {
  rank: number;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  attendees: string[];
  version: number;
}

export interface AssigneeDto {
  id: string;
  name: string;
  isMandatory: boolean;
}

export interface WorkShiftBlock {
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  assignedWorkers: AssigneeDto[];
}

export interface WorkRecommendationResponse {
  rank: number;
  totalCoverage: string;
  weeklyPlan: WorkShiftBlock[];
  version: number;
}

export interface ConfirmScheduleRequest {
  confirmedBlocks: TimeBlock[];
  version: number;
  assignments?: Record<number, string>;
}

export interface ConfirmScheduleResponse {
  sessionId: string;
  status: string;
}

export interface UpdateAvailabilityRequest {
  availableBitmasks: number[];
}

export interface UpdateAvailabilityResponse {
  memberId: number;
  updatedAt: string;
}

export interface ShiftRequirementData {
  day_0: number[];
  day_1: number[];
  day_2: number[];
  day_3: number[];
  day_4: number[];
  day_5: number[];
  day_6: number[];
}

export interface RegisterShiftRequirementRequest {
  requirementData: ShiftRequirementData;
}

export interface RegisterShiftRequirementResponse {
  success: boolean;
  message: string;
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

  getRecommendations: async (sessionId: string) => {
    const res = await apiClient.get<RecommendationResponse[]>(`/api/sessions/${sessionId}/recommendations`);
    return res.data;
  },

  getWorkRecommendations: async (sessionId: string) => {
    const res = await apiClient.get<WorkRecommendationResponse[]>(`/api/sessions/${sessionId}/work-recommendations`);
    return res.data;
  },

  confirmSchedule: async (sessionId: string, data: ConfirmScheduleRequest): Promise<ConfirmScheduleResponse> => {
    const res = await apiClient.post<ConfirmScheduleResponse>(`/api/sessions/${sessionId}/confirm`, data);
    return res.data;
  },

  getConfirmedSchedule: async (sessionId: string): Promise<ConfirmedScheduleResponse> => {
    const res = await apiClient.get<ConfirmedScheduleResponse>(`/api/sessions/${sessionId}/result`);
    return res.data;
  },

  registerShiftRequirements: async (
    sessionId: string,
    adminToken: string,
    data: RegisterShiftRequirementRequest
  ): Promise<RegisterShiftRequirementResponse> => {
    const res = await apiClient.put<RegisterShiftRequirementResponse>(
      `/api/sessions/${sessionId}/requirements`,
      data,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    return res.data;
  },


};

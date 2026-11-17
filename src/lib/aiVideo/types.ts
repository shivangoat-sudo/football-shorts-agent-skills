export const AI_VIDEO_MIN_DURATION_SEC = 10;
export const AI_VIDEO_MAX_DURATION_SEC = 300;

export const AI_VIDEO_ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3"] as const;
export type AIVideoAspectRatio = (typeof AI_VIDEO_ASPECT_RATIOS)[number];

export interface AIVideoReferenceImageDraft {
  id: string;
  file: File;
  label: string;
}

export interface AIVideoCharacterDraft {
  id: string;
  name: string;
  appearanceNotes: string;
  continuityNotes: string;
  referenceImages: AIVideoReferenceImageDraft[];
}

export interface AIVideoSceneDraft {
  id: string;
  startSec: number;
  endSec: number;
  action: string;
  camera: string;
  location: string;
  characterIds: string[];
  dialogue: string;
  audioNotes: string;
}

/** Browser-side editable form state. File objects never go directly into JSON. */
export interface AIVideoDraft {
  prompt: string;
  durationSec: number;
  aspectRatio: AIVideoAspectRatio;
  language: string;
  characters: AIVideoCharacterDraft[];
  scenes: AIVideoSceneDraft[];
}

/** Upload references first; the generation API receives opaque upload IDs only. */
export interface AIVideoGenerationRequest {
  prompt: string;
  durationSec: number;
  aspectRatio: AIVideoAspectRatio;
  language: string;
  modelId: string;
  resolution: string;
  characters: Array<{
    id: string;
    name: string;
    appearanceNotes: string;
    continuityNotes: string;
    referenceUploadIds: string[];
  }>;
  scenes: AIVideoSceneDraft[];
}

export interface AIVideoModelCapabilities {
  modelId: string;
  displayName: string;
  supportsVideo: boolean;
  supportsReferenceImages: boolean;
  supportsMultipleReferenceImages: boolean;
  supportedAspectRatios: AIVideoAspectRatio[];
  supportedResolutions: string[];
  maxSingleClipDurationSec: number;
  maxReferenceImagesPerCharacter: number;
  metadataVersion: string;
}

export type AIVideoJobStatus =
  | "queued"
  | "validating"
  | "generating"
  | "assembling"
  | "quality_check"
  | "completed"
  | "failed"
  | "cancelled";

export interface AIVideoJob {
  id: string;
  status: AIVideoJobStatus;
  progressPercent: number | null;
  statusMessage: string;
  createdAt: string;
  updatedAt: string;
  output?: {
    downloadUrl: string;
    filename: string;
    mimeType: "video/mp4";
    durationSec: number;
    width: number;
    height: number;
    sha256: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface AIVideoValidationIssue {
  path: string;
  code:
    | "required"
    | "out_of_range"
    | "invalid_value"
    | "duplicate_id"
    | "invalid_reference"
    | "invalid_timeline";
  message: string;
}

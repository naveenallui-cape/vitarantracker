export {};

type TrackerApi = {
  getState: () => Promise<{
    registered: boolean;
    employeeId: string;
    deviceName: string;
    hostname: string;
    backendUrl: string;
    status: string;
    platform: string;
    windowsOnly: boolean;
  }>;
  register: (payload: {
    backendUrl: string;
    employeeId: string;
    registrationCode: string;
    deviceName: string;
  }) => Promise<{ success: boolean; deviceId: string }>;
  onStatus: (listener: (status: string) => void) => void;
};

declare global {
  interface Window {
    vitarantracker: TrackerApi;
  }
}

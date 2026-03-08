export interface StudentData {
  id: number;
  name: string;
  score: number;
  status: "Aman" | "Pemantauan" | "Kritis";
  lastActive: string;
  readTime: string;
  ipAddress: string;
  clicks: number;
}

export const fetchStudents = async (): Promise<StudentData[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: "Andi Wijaya", score: 92, status: "Aman", lastActive: "2 jam lalu", readTime: "45m", ipAddress: "192.168.1.12", clicks: 120 },
        { id: 2, name: "Budi Santoso", score: 75, status: "Pemantauan", lastActive: "1 hari lalu", readTime: "15m", ipAddress: "10.0.0.5", clicks: 45 },
        { id: 3, name: "Citra Lestari", score: 45, status: "Kritis", lastActive: "3 hari lalu", readTime: "2m", ipAddress: "172.16.0.8", clicks: 5 },
        { id: 4, name: "Dewi Sartika", score: 88, status: "Aman", lastActive: "5 jam lalu", readTime: "30m", ipAddress: "192.168.1.45", clicks: 80 },
        { id: 5, name: "Eko Prasetyo", score: 60, status: "Pemantauan", lastActive: "2 hari lalu", readTime: "10m", ipAddress: "10.0.0.22", clicks: 25 },
      ]);
    }, 500);
  });
};

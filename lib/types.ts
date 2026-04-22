export type PointDTO = {
  id: string;
  lat: number;
  lng: number;
  title: string | null;
  description: string | null;
  author: string | null;
  photoKey: string;
  photoUrl: string;
  photoWidth: number | null;
  photoHeight: number | null;
  createdAt: string;
};

import { Collection } from "mongodb";
import { NinoModel, UbicacionModel, Nino, Ubicacion } from "./types.ts";

  export const fromModelToNino = async (
    ninoDB: NinoModel,
    ubicacionesCollection: Collection<UbicacionModel>
  ): Promise<Nino> => {
    const ubicaciones = await ubicacionesCollection
      .find({ _id: { $in: ninoDB.ubicacionId } })
      .toArray();
    return {
      id: ninoDB._id!.toString(),
      nombre: ninoDB.nombre,
      comportamiento: ninoDB.comportamiento,
      ubicacionId: ubicaciones.map((u) => fromModelToUbicacion(u)),
    };
  };
  
  export const fromModelToUbicacion = (model: UbicacionModel): Ubicacion => ({
    id: model._id!.toString(),
    nombre: model.nombre,
    coordenadas: model.coordenadas,
    ninosBuenos: model.ninosBuenos,
  });

  export const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c;
  };
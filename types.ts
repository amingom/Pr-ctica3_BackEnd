import { ObjectId } from "mongodb";

export type NinoModel = {
    _id?: ObjectId;
    nombre: string;
    comportamiento: "bueno" | "malo";
    ubicacionId: ObjectId[];
}

export type UbicacionModel = {
    _id?: ObjectId;
    nombre: string;
    coordenadas: { lat: number; lon: number};
    ninosBuenos: number;
}

export type Nino ={
    id: string;
    nombre: string;
    comportamiento: "bueno" | "malo";
    ubicacionId: Ubicacion[];
}

export type Ubicacion = {
    id: string;
    nombre: string;
    coordenadas: { lat: number; lon: number};
    ninosBuenos: number;
}
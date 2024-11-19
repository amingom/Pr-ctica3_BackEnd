import { MongoClient, ObjectId } from 'mongodb';
import { NinoModel, UbicacionModel } from "./types.ts";
import { fromModelToNino, fromModelToUbicacion, haversine } from "./resolvers.ts";

const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  console.error("MONGO_URL is not set");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("Practica3");
const ninosCollection = db.collection<NinoModel>("ninos");
const ubicacionesCollection = db.collection<UbicacionModel>("ubicaciones");

const handler = async (req: Request): Promise<Response> => {
  const method = req.method; 
  const url = new URL(req.url); 
  const path = url.pathname; 

  if (method === "GET") {
    if (path === "/ninos/buenos") {
      const ninoDB = await ninosCollection.find({ comportamiento: "bueno" }).toArray();
      const buenos = await Promise.all(
        ninoDB.map((n) => fromModelToNino(n, ubicacionesCollection))
      );
      return new Response(JSON.stringify(buenos));
    } else if (path === "/ninos/malos") {
      const ninoDB = await ninosCollection.find({ comportamiento: "malo" }).toArray();
      const malos = await Promise.all(
        ninoDB.map((n) => fromModelToNino(n, ubicacionesCollection))
      );
      return new Response(JSON.stringify(malos));
    } else if (path === "/entregas"){
      const ubicaciones = await ubicacionesCollection.find().toArray();
      const ordenadas = ubicaciones.sort(
        (a, b) => b.ninosBuenos - a.ninosBuenos
      );
      return new Response(JSON.stringify(ordenadas.map(fromModelToUbicacion)), {status: 200});
    } else if (path === "/ruta"){
      const ubicaciones = await ubicacionesCollection.find().toArray();
      const ordenadas = ubicaciones.sort((a, b) => b.ninosBuenos - a.ninosBuenos);

      let distanciaTotal = 0;
      for (let i = 0; i < ordenadas.length - 1; i++) {
        const { lat: lat1, lon: lon1 } = ordenadas[i].coordenadas;
        const { lat: lat2, lon: lon2 } = ordenadas[i + 1].coordenadas;
        distanciaTotal += haversine(lat1, lon1, lat2, lon2);
      }

      return new Response(JSON.stringify({ distanciaTotal }), { status: 200 });
    
    }
  } else if (method === "POST") {
    if(path === "/ubicacion"){
      const ubicacion = await req.json();
      const { nombre, coordenadas } = ubicacion;

      if (!nombre || !coordenadas || !coordenadas.lat || !coordenadas.lon) {
        return new Response("Bad request", { status: 400 });
      }

      const { lat, lon } = coordenadas;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return new Response("Coordenadas no válidas", { status: 400 });
      }

      const existe = await ubicacionesCollection.findOne({ nombre });
      if (existe) {
        return new Response("Ubicación ya existe", { status: 409 });
      }

      const { insertedId } = await ubicacionesCollection.insertOne({
        nombre,
        coordenadas,
        ninosBuenos: 0,
      });

      return new Response(
        JSON.stringify({ id: insertedId, nombre, coordenadas, ninosBuenos: 0 }),
        { status: 201 }
      );

    } else if (path === "/ninos"){
      const nino = await req.json();
      const { nombre, comportamiento, ubicacionId } = nino;

      if (!nombre || !comportamiento || !ubicacionId) {
        return new Response("Bad request", { status: 400 });
      }

      if (comportamiento !== "bueno" && comportamiento !== "malo") {
        return new Response("Comportamiento inválido", { status: 400 });
      }

      const ubicacion = await ubicacionesCollection.findOne({
        _id: new ObjectId(ubicacionId),
      });
      if (!ubicacion) {
        return new Response("Ubicación no encontrada", { status: 404 });
      }

      const existe = await ninosCollection.findOne({ nombre });
      if (existe) {
        return new Response("Niño ya existe", { status: 409 });
      }

      const { insertedId } = await ninosCollection.insertOne({
        nombre,
        comportamiento,
        ubicacionId: [new ObjectId(ubicacionId)], 
      });

      if (comportamiento === "bueno") {
        await ubicacionesCollection.updateOne(
          { _id: new ObjectId(ubicacionId) },
          { $inc: { ninosBuenos: 1 } } 
        );
      }

      return new Response(
        JSON.stringify({ id: insertedId, nombre, comportamiento, ubicacionId: [ubicacionId] }),
        { status: 201 }
      );
    }
  }
  return new Response("Not found", { status: 404 });
};

Deno.serve({ port: 6768 }, handler);

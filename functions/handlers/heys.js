const { db, admin } = require("../util/admin");

const config = require("../util/config");

//Aquí obtenemos el Documento heys usando express
exports.getAllHeys = (req, res) => {
  // Aqui tenemos el acceso a nuestro Admin Object en Firebase
  db.collection("heys")
    // Esto organiza el orden de las publicaciones en "desc"(descendente)
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let hey = [];
      data.forEach((doc) => {
        hey.push({
          heyId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          imageUrl: doc.data().imageUrl,
          ciudad: doc.data().ciudad,
          barrioSector: doc.data().barrioSector,
          precio: doc.data().precio,
          amoblado: doc.data().amoblado,
          direccion: doc.data().direccion,
          userImage: doc.data().userImage,
        });
      });
      return res.json(hey);
    })
    .catch((err) => console.error(err));
};

// Cargar Imagenes
// Instalamos Busboy para las imagenes
exports.uploadImagePost = (req, res) => {
  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new Busboy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    // console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Formato de Archivo NO admitido" });
    }
    // image.png
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 135465468431324.png
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        //    return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        return db.doc(`/heys/${req.params.heyId}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "Imagen cargada con éxito" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

//Aquí creamos el Documento hey (Post hey)
exports.postOneHey = (req, res) => {
  if (req.body.body.trim() === "")
    res.status(400).json({ body: "No debe estar vacio" });
  if (req.body.ciudad.trim() === "")
    res.status(400).json({ ciudad: "No debe estar vacio" });
  if (req.body.barrioSector.trim() === "")
    res.status(400).json({ barrioSector: "No debe estar vacio" });
  if (req.body.precioPorMes.trim() === "")
    res.status(400).json({ precio: "No debe estar vacio" });
  if (req.body.precioPorDia.trim() === "")
    res.status(400).json({ precio: "No debe estar vacio" });
  if (req.body.amoblado.trim() === "")
    res.status(400).json({ amoblado: "No debe estar vacio" });
  if (req.body.direccion.trim() === "")
    res.status(400).json({ direccion: "No debe estar vacio" });

  if (req.body.body.length >= 500)
    res.status(400).json({ body: "No puedes usar más de 500 caracteres" });
  if (req.body.ciudad.length >= 70)
    res.status(400).json({
      ciudad: "Debes poner un nombre de ciudad más corto o abreviado",
    });
  if (req.body.barrioSector.length >= 70)
    res.status(400).json({
      barrioSector:
        "Debes poner un nombre de Barrio o Sector más corto o abreviado",
    });
  if (req.body.precioPorMes.length >= 20)
    res.status(400).json({
      precioPorMes: "El valor debe estar en números y en una cifra real",
    });
  if (req.body.precioPorDia.length >= 20)
    res.status(400).json({
      precioPorDia: "El valor debe estar en números y en una cifra real",
    });
  if (req.body.amoblado.length >= 3)
    res.status(400).json({ amoblado: "Solo puedes poner SI o NO" });
  if (req.body.direccion.length >= 100)
    res.status(400).json({
      direccion:
        "Debes poner un nombre de Barrio o Sector más corto o abreviado",
    });

  const nada = "nada.png";

  const newHey = {
    // Aquí el primer Body es el Body del Request y el segundo es la propiedad Body en el Request
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    userImage: req.user.imageUrl,
    imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${nada}?alt=media`,
    ciudad: req.body.ciudad,
    barrioSector: req.body.barrioSector,
    precioPorMes: req.body.precioPorMes,
    precioPorDia: req.body.precioPorDia,
    amoblado: req.body.amoblado,
    direccion: req.body.direccion,
    likeCount: 0,
    commentCount: 0,
  };

  db.collection("heys")
    .add(newHey)
    .then((doc) => {
      const resHey = newHey;
      resHey.heyId = doc.id;
      res.json(resHey);
    })
    .catch((err) => {
      res.status(500).json({ error: "algo salió mal" });
      console.error(err);
    });
};

// Acceder a un hey en particular
exports.getHey = (req, res) => {
  let heyData = {};
  db.doc(`/heys/${req.params.heyId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Publicación no encontrada" });
      }
      heyData = doc.data();
      heyData.heyId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("heyId", "==", req.params.heyId)
        .get();
    })
    .then((data) => {
      heyData.comments = [];
      data.forEach((doc) => {
        heyData.comments.push(doc.data());
      });
      return res.json(heyData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comentar un Post por Id
exports.commentOnHey = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "No debe estar vacio" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    heyId: req.params.heyId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
         
  db.doc(`/heys/${req.params.heyId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "No encontrado" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Algo salió mal" });
    });
};

// Me gusta en una publicación
exports.likeHey = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("heyId", "==", req.params.heyId)
    .limit(1);

  const heyDocument = db.doc(`/heys/${req.params.heyId}`);

  let heyData;

  heyDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        heyData = doc.data();
        heyData.heyId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Publicación no encontrada" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            heyId: req.params.heyId,
            userHandle: req.user.handle,
          })
          .then(() => {
            heyData.likeCount++;
            return heyDocument.update({ likeCount: heyData.likeCount });
          })
          .then(() => {
            return res.json(heyData);
          });
      } else {
        return res.status(400).json({ error: "Ya le diste Like bro!" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Ya NO Me gusta en una publicación
exports.unlikeHey = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("heyId", "==", req.params.heyId)
    .limit(1);

  const heyDocument = db.doc(`/heys/${req.params.heyId}`);

  let heyData;

  heyDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        heyData = doc.data();
        heyData.heyId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Publicación no encontrada" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Ya no te gusta" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            heyData.likeCount--;
            return heyDocument.update({ likeCount: heyData.likeCount });
          })
          .then(() => {
            res.json(heyData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Eliminar una publicación
exports.deleteHey = (req, res) => {
  const document = db.doc(`/heys/${req.params.heyId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Publicación No encontrada" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "No Autorizado" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Publicación Eliminada con Éxito" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

const functions = require("firebase-functions");

// Invocamos express luego de haberlo instalado en nuestra carpeta functions (cd functions)
// npm install --save express
const app = require("express")();

const FBAuth = require("./util/fbAuth");

const { db } = require("./util/admin");

const {
  getAllHeys,
  postOneHey,
  getHey,
  commentOnHey,
  uploadImagePost,
  likeHey,
  unlikeHey,
  deleteHey,
} = require("./handlers/heys");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");

//Heys Routes
app.get("/heys", getAllHeys);
app.post("/hey", FBAuth, postOneHey);
app.post("/hey/:heyId/image", FBAuth, uploadImagePost);
app.get("/hey/:heyId", getHey);
app.post("/hey/:heyId/comment", FBAuth, commentOnHey);
app.delete("/hey/:heyId", FBAuth, deleteHey);
app.get("hey/:heyId/like", FBAuth, likeHey);
app.get("hey/:heyId/unlike", FBAuth, unlikeHey);

//User Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

//Creamos la ruta para la Api
exports.api = functions.https.onRequest(app);

// Notificaciones
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/heys/${snapshot.data().heyId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            heyId: doc.id,
          });
        }
      })
      .catch((err) => console.error(err));
  });

exports.deleteNotificationOnUnLike = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/heys/${snapshot.data().heyId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            heyId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// Cambio de foto de Usuario
exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Esta imagen ha sido cambiada");
      const batch = db.batch();
      return db
        .collection("heys")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const hey = db.doc(`/heys/${doc.id}`);
            batch.update(hey, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });


// Eliminar publicación
// Aquí eliminamos la publicación junto con los likes y todas las notificaciones
exports.onHeyDelete = functions.firestore
  .document("/heys/{heyId}")
  .onDelete((snapshot, context) => {
    const heyId = context.params.heyId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("heyId", "==", heyId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("heyId", "==", heyId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db.collection("notifications").where("heyId", "==", heyId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });


  /*
// Este código es en caso de que querer que en la plataforma se puedan compartir publicaciones dentro de otras 
// Cambio de foto de publicación
exports.onHeyImageChange = functions.firestore
  .document("/heys/{heyId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Esta imagen ha sido cambiada");
      const batch = db.batch();
      return db
        .doc(`/heys/${req.params.heyId}`)
  //      .collection("heys")
  //      .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const hey = db.doc(`/heys/${doc.id}`);
            batch.update(hey, { imageUrl: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

*/
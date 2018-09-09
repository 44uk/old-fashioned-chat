const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const profsRef = functions.database.ref('/profs/{uid}');
const logsRef = admin.database().ref('/logs');

const ADMIN_NAME = "■管理人■";
const ADMIN_COLOR = "yellow";

exports.postWeclomeMessage = profsRef.onCreate((snap, context) => {
  console.debug('--- profs#onCreate')
  const prof = snap.val();
  return logsRef.push({
    name: ADMIN_NAME,
    color: ADMIN_COLOR,
    body: `${prof.name || 'No Name'}さんが入室しました。`,
    date: (new Date()).toISOString()
  });
});

exports.postByeMessage = functions.auth.user().onDelete(user => {
  console.debug('--- user#onDelete')
  const profRef = admin.database().ref(`/profs/${user.uid}`);
  return profRef.on('value', snap => {
    const prof = snap.val();
    logsRef.push({
      name: ADMIN_NAME,
      color: ADMIN_COLOR,
      body: `${prof.name || 'No Name'}さんが退室しました。`,
      date: (new Date()).toISOString()
    })
    return profRef.remove();
  })
});


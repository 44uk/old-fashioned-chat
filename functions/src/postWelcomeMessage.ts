import util from './util';
export default (admin, funcs) => {
  const logsRef = admin.database().ref('/logs');
  return (snap, context) => {
    const prof = snap.val();
    console.log(`--- postWelcomeMessage: ${prof.name}`)
    return logsRef.push({
      name:  util.ADMIN_NAME,
      color: util.ADMIN_COLOR,
      body:  `${prof.name}さんが入室しました。`,
      date:  (new Date()).toISOString()
    });
  };
}

import util from './util';
export default (admin, funcs) => {
  const logsRef = admin.database().ref('/logs');
  return (user) => {
    console.log(`--- user(${user.uid})#onDelete`);
    const profRef = admin.database().ref(`/profs/${user.uid}`);
    return profRef.on('value', async snap => {
      const prof = snap.val();
      const name = prof.name;
//   // FIXME: これが実行されると `TypeError: Cannot read property 'name' of null` がでる
//   // 退室メッセージをだして、profsを消したいのは実現できてはいる。
      await profRef.remove();
      return logsRef.push({
        name:  util.ADMIN_NAME,
        color: util.ADMIN_COLOR,
        body:  `${name}さんが退室しました。`,
        date:  (new Date()).toISOString()
      });
    });

    // return profRef.on('value', async snap => {
    //   const prof = snap.val();
    //   await logsRef.push({
    //     name:  util.ADMIN_NAME,
    //     color: util.ADMIN_COLOR,
    //     body:  `${prof.name}さんが退室しました。`,
    //     date:  (new Date()).toISOString()
    //   });
    //   // FIXME: これが実行されると `TypeError: Cannot read property 'name' of null` がでる
    //   // 退室メッセージをだして、profsを消したいのは実現できてはいる。
    //   return profRef.remove();
    // });
  };
}


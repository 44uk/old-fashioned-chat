function main() {
  // FIXME: 色の定義バリデーションが必要
  var COLOR_DEFS = [
    {value: 'deepskyblue'  , text: 'あお'},
    {value: 'palevioletred', text: 'あか'},
    {value: 'limegreen'    , text: 'みどり'},
    {value: 'mediumpurple' , text: 'むらさき'},
    {value: 'hotpink'      , text: 'ピンク'},
    {value: 'darkorange'   , text: 'オレンジ'}
  ];

  var config = {
    apiKey: "AIzaSyDvPQCWEA0gK0B_TE-C0B5bKL2GFCb4EdM",
    authDomain: "old-fashioned-chat.firebaseapp.com",
    databaseURL: "https://old-fashioned-chat.firebaseio.com",
    projectId: "old-fashioned-chat",
    storageBucket: "old-fashioned-chat.appspot.com",
    messagingSenderId: "915821039605"
  };
  firebase.initializeApp(config);

  Vue.directive('focus', {
    inserted: function (el) {
      el.focus();
    }
  });

  Vue.component('enter-form', {
    data: function () {
      return {
        errors: [],
        name: null,
        color: null
      }
    },
    template: '#tmpl-enter-form',
    methods: {
      submit: function (ev) {
        ev.preventDefault();
        if(this.validate()) {
          this.$emit('on-submit', {name: this.name, color: this.color});
        } else {
          this.$emit('on-submit', {name: this.name, color: this.color, errors: this.errors});
        }
      },
      validate: function () {
        this.errors = [];
        if (this.name.length > 16) {
          this.errors.push('名前は16文字以内です。');
        }
        if (this.color && COLOR_DEFS[this.color]) {
          this.errors.push('色を選択してください。');
        }
        return this.errors.length === 0;
      }
    }
  });

  /**
   * TODO: 今回バリデーションロジックをモジュールに持たせた
   * これは使う側で持つほうがいいのか？
   * つまりモジュールはバリデーションに関与しないほうがいいのか
   */
  Vue.component('input-form', {
    data: function () {
      return {
        errors: [],
        text: null,
        file: null
      }
    },
    template: '#tmpl-input-form',
    computed: {
      fileAttached: function () {
        return this.file !== null;
      }
    },
    methods: {
      submit: function (ev) {
        ev.preventDefault();
        if(this.validate()) {
          this.$emit('on-submit', {text: this.text, file: this.file});
          this.text = null;
          this.file = null;
          this.$refs.file.value = "";
        } else {
          this.$emit('on-submit', {text: this.text, file: this.file, errors: this.errors});
        }
      },
      onSetFile: function (ev) {
        ev.preventDefault();
        var files = ev.target.files || ev.dataTransfer.files;
        if (files.length !== 1) return;
        this.file = files[0];
      },
      validate: function () {
        this.errors = [];
        if (!this.text) {
          this.errors.push('発言は必須です。');
        }
        if (this.text && this.text.length > 120) {
          this.errors.push('発言は120文字までに制限されています。');
        }
        if (this.file && !this.file.type.match('image.*')) {
          this.errors.push('ファイルは画像のみ許可されています。');
        }
        return this.errors.length === 0;
      }
    }
  });

  Vue.component('color-selector', {
    props: {
      required: Boolean
    },
    data: function () {
      return {
        colors: COLOR_DEFS,
      };
    },
    created: function () {
      if(! this.color) {
        this.$emit('input', COLOR_DEFS[0].value);
      }
    },
    template: '#tmpl-color-selector',
    methods: {
      updateValue: function (ev) {
        var selected = ev.target.selectedOptions[0];
        if (selected) {
          var key = selected.getAttribute('name');
          this.$emit('input', key);
          this.$emit('selected', key);
        }
      }
    }
  });

  Vue.component('logs', {
    props: {
      collection: Array
    },
    template: '#tmpl-logs'
  });

  Vue.component('log', {
    props: {
      log: Object
    },
    template: '#tmpl-log',
    computed: {
      localDatetime: function () {
        if(!this.log.date){return ''}
        var date = new Date(this.log.date);
        return date.toLocaleDateString() +
          ' ' + date.toLocaleTimeString()
        ;
      },
      nameColor: function () {
        return { color: this.log.color };
      }
    },
    methods: {
      submit: function (ev) {
        this.$emit('submit', key);
      }
    }
  });

  var vm = new Vue({
    el: "#app",
    data: function () {
      return {
        session: null,
        logs: []
      }
    },
    created: function () {
      var logsRef = firebase.database().ref('logs');
      // TODO: これだと初回の読み込みで取ってきた件数だけunshiftが動く。
      // 初回のロードでまるっと取ってきた配列を突っ込むとかは？
      // そもそもなぜchild_addedなのに初回の読み込みで100件落ちてくるのか
      // とりあえずこれで初回の読み込みと追加された時の挙動はできてはいる
      // https://github.com/firebase/friendlychat-web/blob/master/web/scripts/main.js#L53
      // やはり同じようなことをやっているからこれでいいっぽい？
      logsRef.orderByChild('date').limitToLast(100).on('child_added', function (data) {
        console.debug('called on child_added on /logs')
        var log = data.val();
        log.key = data.key;
        this.logs.unshift(log);
      }.bind(this));

      // TODO: ログイン済みかどうかの判断もこれでいいのか謎い
      // https://github.com/firebase/friendlychat-web/blob/master/web/scripts/main.js#L166
      // サンプルみるといいっぽい
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          console.debug('logged in');
          this.login(user);
        } else {
          console.debug('not logged in');
        }
      }.bind(this));
    },
    methods: {
      enter: function (payload) {
        if (payload.errors) {
          this.write(payload);
          return false;
        }
        firebase.auth().signInAnonymously().then(function (data) {
          console.debug('signInAnonymously')
          var user = data.user;
          var profRef = firebase.database().ref('profs/' + user.uid);
          var prof = {
            name: payload.name,
            color: payload.color
          }
          // TODO: user.displayNameもあるけど
          // colorも持たせたいし、profに持たせてみた
          // user.updateProfile({displayName: 'hoge'}) でできる
          // TODO: setに失敗したときのエラー処理が上手くできていない
          return profRef.set(prof).then(function () {
            return user;
          });
        }.bind(this))
        .then(function (data) {
          this.login(data);
        }.bind(this))
        .catch(function (err) {
          // TODO: バリデーション時にエラーがわからない
          // つまりクライアント再度でのバリデーションにだけたより
          // 書き込み時のエラーは気にしないということか？
          alert("ログインに失敗しました。もう一度お試しください。");
          console.error(err)
        });
      },
      login: function (user) {
        var profRef = firebase.database().ref('profs/' + user.uid);
        return profRef.on('value', function (snap) {
          var prof = snap.val();
          if (!prof) {
            console.log('failed to register profile. force to remove user.');
            firebase.auth().currentUser.delete()
            return false;
          }
          this.session = {
            uid: user.uid,
            name: prof.name,
            color: prof.color
          };
          return this.session;
        }.bind(this))
      },
      write: function (payload) {
        if (payload.errors) {
          this.logs.unshift({
            name: 'ERROR',
            color: 'red',
            body: payload.errors.join("\n")
          });
        } else {
          var p;
          if (payload.file) {
            p = this.uploadFile(payload.file);
          } else {
            p = new Promise(function(r, _) { r(null); });
          }
          p.then(function (attachmentUrl) {
            this.post(this.session, payload.text, attachmentUrl)
              .catch(function (err) {
                console.log(err);
              })
            ;
          }.bind(this));
        }
      },
      post: function (session, body, attachmentUrl) {
        var logsRef = firebase.database().ref('logs');
        return logsRef.push({
          name: session.name,
          color: session.color,
          body: body,
          attachmentUrl: attachmentUrl,
          date: (new Date()).toISOString()
        });
        // FIXME: これではソースを書き換えて発言者名や色や時間を変えられてしまう
        // 名前と色はサーバで処理しないとだめ？
        // ルールで一致しない場合に落とすということか？
        // https://github.com/firebase/friendlychat-web/blob/master/web/scripts/main.js#L65
        // このサンプルも名前を書き換えたら任意で変えられるじゃん？
        // 許容しているということ？

        // 取ってくるパターンも考えたが、結局送るタイミングでの話なので意味なかったわ…
        // var user = firebase.auth().currentUser;
        // var profRef = firebase.database().ref('profs/' + user.uid);
        // return profRef.on('value', function (snap) {
        //   var prof = snap.val();
        //   return logsRef.push({
        //     name: prof.name,
        //     color: prof.color,
        //     body: body,
        //     date: (new Date()).toISOString()
        //   });
        // }.bind(this))
      },
      exit: function (ev) {
        ev.preventDefault();
        // signOutではfunctionsのトリガーが発火しない
        // signOutのときのトリガーとかあるんだろうか？
        // firebase.auth().signOut()
        firebase.auth().currentUser.delete()
          .then(function (_) {
            return this.logout();
          }.bind(this))
          .catch(function(err) {
            console.log(err);
          })
        ;
      },
      logout: function () {
        var name = this.session.name;
        this.session = null;
        return Promise.resolve(name);
      },
      uploadFile: function (file) {
        var filePath = this.session.uid +
          '/' + Date.now() +
          '/' + encodeURIComponent(file.name)
        ;
        return firebase.storage().ref(filePath).put(file).then(function (fileSnap) {
          // console.log(fileSnap);
          return fileSnap.ref.getDownloadURL();
        })
      }
    }
  });
}
window.addEventListener('DOMContentLoaded', main);
window.addEventListener('load', function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("/serviceWorker.js")
      .then(function(registration) {
        console.log("serviceWorker registered.");
      }).catch(function(error) {
        console.warn("serviceWorker error.", error);
      })
    ;
  }
});

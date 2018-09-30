import * as admin from 'firebase-admin';
import * as funcs from 'firebase-functions';

import postWelcomeMessage from './postWelcomeMessage';
import postByeMessage from './postByeMessage';

admin.initializeApp();

const profsRef = funcs.database.ref('/profs/{uid}');

exports.postWelcomeMessage = profsRef.onCreate(postWelcomeMessage(admin, funcs));
exports.postByeMessage = funcs.auth.user().onDelete(postByeMessage(admin, funcs));


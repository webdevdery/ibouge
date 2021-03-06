import io from 'socket.io-client';
import {eventChannel} from 'redux-saga';
import * as types from '../actions/action_types/message';

import {fork, take, call, put, cancel} from 'redux-saga/effects';
import {
  login,
  logout,
  addUser,
  removeUser,
  newMessage,
  // sendMessage,
} from '../actions/socket';

function connect() {
  console.log('trying to connect socket.io...');
  const socket = io('http://localhost:5000');
  return new Promise((resolve) => {
    socket.on('connect', () => {
      resolve(socket);
    });
  });
}

function subscribe(socket) {
  return eventChannel((emit) => {
    socket.on('users.login', ({username}) => {
      emit(addUser({username}));
    });
    socket.on('users.logout', ({username}) => {
      emit(removeUser({username}));
    });
    socket.on('messages.new', ({message}) => {
      emit(newMessage({message}));
    });
    socket.on('disconnect', (e) => {
      // TODO: handle
    });
    return () => {};
  });
}

function* read(socket) {
  const channel = yield call(subscribe, socket);
  while (true) {
    let action = yield take(channel);
    yield put(action);
  }
}

function* write(socket) {
  while (true) {
    const {payload} = yield take(types.GET_MESSAGES_LOADING);
    console.log('emit message', payload);
    socket.emit('message', payload);
  }
}

function* handleIO(socket) {
  yield fork(read, socket);
  yield fork(write, socket);
}

function* flow() {
  while (true) {
    let {payload} = yield take(`${login}`);
    const socket = yield call(connect);
    socket.emit('login', {username: payload.username});

    const task = yield fork(handleIO, socket);

    let action = yield take(`${logout}`);
    yield cancel(task);
    socket.emit('logout');
  }
}
const socketSaga = [fork(flow)];
export default socketSaga;

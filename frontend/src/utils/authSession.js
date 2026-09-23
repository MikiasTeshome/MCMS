const TOKEN_KEY = 'mcms_token';
const USER_KEY = 'mcms_user';
const CHANNEL_NAME = 'mcms-session';

let broadcastSeq = 0;

const readUserJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function getSharedToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSharedUser() {
  return readUserJson(localStorage.getItem(USER_KEY));
}

function notifyOtherTabs() {
  broadcastSeq += 1;
  const seq = broadcastSeq;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ seq });
    channel.close();
  } catch {
    // Older browsers still get the storage event from localStorage writes.
  }
}

export function persistSharedSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function writeSharedSession(token, user) {
  persistSharedSession(token, user);
  notifyOtherTabs();
}

export function clearSharedSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyOtherTabs();
}

/** Other tabs only. The tab that wrote storage does not receive these. */
export function subscribeSharedSession(onChange) {
  const emit = () => onChange({ token: getSharedToken(), user: getSharedUser() });

  const onStorage = (event) => {
    if (event.key && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
    emit();
  };

  window.addEventListener('storage', onStorage);

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.seq === broadcastSeq) return;
      emit();
    };
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) channel.close();
  };
}

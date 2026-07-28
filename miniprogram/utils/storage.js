// utils/storage.js
// 偏好/忌口、当前状态、每日健康记录的本地存储封装

const PREF_KEY = 'user_profile';
const STATUS_KEY = 'current_status';
const RECORDS_KEY = 'health_records';
const TARGET_KEY = 'step_target';
const ENERGY_TARGET_KEY = 'energy_target';
const HEALTH_AVATAR_KEY = 'health_avatar';
const CUSTOM_STATUS_KEY = 'custom_status_label';

function defaultProfile() {
  return {
    cuisine: [],   // 偏好菜系：川/粤/家常/日式/西式/轻食
    staple: [],    // 偏好主食：米饭/面/杂粮/薯类
    fruit: [],     // 偏好水果
    avoidTaste: [], // 忌口口味：辣/油腻/甜/咸
    avoidVeg: [],   // 忌口蔬菜
    avoidFruit: [],  // 忌口水果
    customPrefer: '', // 自由输入的偏好（如"想吃海鲜、多补充蛋白"）
    customAvoid: ''   // 自由输入的忌口（如"对花生过敏、不吃牛肉"）
  };
}

function getProfile() {
  const p = wx.getStorageSync(PREF_KEY);
  return Object.assign(defaultProfile(), p || {});
}

function setProfile(p) {
  wx.setStorageSync(PREF_KEY, p);
}

function getStatus() {
  return wx.getStorageSync(STATUS_KEY) || 'normal';
}

function setStatus(s) {
  wx.setStorageSync(STATUS_KEY, s);
}

function getStepTarget() {
  return wx.getStorageSync(TARGET_KEY) || 8000;
}

function setStepTarget(n) {
  wx.setStorageSync(TARGET_KEY, n);
}

function getEnergyTarget() {
  return wx.getStorageSync(ENERGY_TARGET_KEY) || 300;
}

function setEnergyTarget(n) {
  wx.setStorageSync(ENERGY_TARGET_KEY, n);
}

function getHealthAvatar() {
  return wx.getStorageSync(HEALTH_AVATAR_KEY) || '';
}

function setHealthAvatar(url) {
  wx.setStorageSync(HEALTH_AVATAR_KEY, url);
}

// records: { 'YYYY-MM-DD': { steps, weight, photos:[tempPath], meals:[...] } }
function getRecords() {
  return wx.getStorageSync(RECORDS_KEY) || {};
}

function setRecords(r) {
  wx.setStorageSync(RECORDS_KEY, r);
}

function getDayRecord(dateStr) {
  const all = getRecords();
  return all[dateStr] || { steps: 0, weight: '', photos: [], meals: [] };
}

function setDayRecord(dateStr, rec) {
  const all = getRecords();
  all[dateStr] = rec;
  setRecords(all);
}

function getCustomStatusLabel() {
  return wx.getStorageSync(CUSTOM_STATUS_KEY) || '';
}

function setCustomStatusLabel(label) {
  wx.setStorageSync(CUSTOM_STATUS_KEY, label);
}

// 位置存储（身份/学校/校区）
const LOC_KEY = 'user_location';
function getLocation(key) {
  try {
    const obj = JSON.parse(wx.getStorageSync(LOC_KEY) || '{}');
    return key ? (obj[key] || '') : obj;
  } catch(e) { return key ? '' : {}; }
}
function setLocation(key, val) {
  const obj = getLocation();
  obj[key] = val;
  wx.setStorageSync(LOC_KEY, JSON.stringify(obj));
}

module.exports = {
  getProfile,
  setProfile,
  getStatus,
  setStatus,
  getStepTarget,
  setStepTarget,
  getEnergyTarget,
  setEnergyTarget,
  getHealthAvatar,
  setHealthAvatar,
  getCustomStatusLabel,
  setCustomStatusLabel,
  getLocation,
  setLocation,
  getRecords,
  setRecords,
  getDayRecord,
  setDayRecord
};

const clone = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));
function createStore(storage) {
  return {
    read() {
      try {
        return clone(storage.get());
      } catch (_) {
        throw new Error("本机存储读取失败，请检查设备空间后重试");
      }
    },
    write(state) {
      try {
        storage.set(clone(state));
      } catch (_) {
        throw new Error("本机存储保存失败，请检查设备空间后重试");
      }
    },
    reset() {
      this.write(undefined);
    },
  };
}
module.exports = { createStore };

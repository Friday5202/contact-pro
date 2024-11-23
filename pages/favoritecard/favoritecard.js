// favoritecard.js
wx.cloud.init({
  env: 'friday-4g84qq5vab762cd2'  // 替换为你的云开发环境 ID
});

const db = wx.cloud.database();  // 获取云数据库实例
const favoritesCollection = db.collection('favorites');  // 指向 'favorites' 集合

Page({
  data: {
    contact: {} // 存储联系人数据
  },

  onLoad: function (options) {
    const contactId = options.id;  // 获取传递的联系人ID
    this.loadContact(contactId); // 加载该联系人信息
  },

  loadContact(id) {
    let self = this;
    favoritesCollection.doc(id).get({
      success: res => {
        self.setData({
          contact: res.data // 将获取的数据设置到 contact 中用于页面展示
        });
      },
      fail: err => {
        console.error('获取联系人信息失败：', err);
      }
    });
  }
});

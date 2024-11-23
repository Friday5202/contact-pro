// 初始化云开发
wx.cloud.init({
  env: 'friday-4g84qq5vab762cd2'  // 替换为你的云开发环境 ID
});

const db = wx.cloud.database();  // 获取云数据库实例
const favoritesCollection = db.collection('favorites');  // 指向 'favorites' 集合

Page({
  data: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ#",  // 字母表，包括 # 符号
    contact: [],  // 用于存储原始联系人姓名
    filteredContacts: [],  // 用于存储筛选后的联系人
    loc: "",
    screenHeight: 0
  },

  // 从云数据库中获取联系人姓名
  loadContactsFromDatabase() {
    let self = this;
    console.log('开始加载联系人数据...'); 

    favoritesCollection.field({
      name: true,  // 只获取姓名字段
      phone: true, // 获取电话字段
      email: true, // 获取邮箱字段
      address: true,// 获取地址字段
      _id: true    // 需要传递联系人 _id 用于跳转
    }).get({
      success: res => {
        let contacts = res.data;  // 获取到的联系人数组
        self.arrangeContact(contacts);  // 调用联系人分组方法
      },
      fail: err => {
        console.error('从数据库获取联系人失败：', err);
      }
    });
  },

  // 整理通讯录，中文姓名归类到 #，英文姓名按首字母分组
  arrangeContact(favorites) {
    var self = this;
    var contact = [];

    // 遍历字母表，对联系人进行分组
    for (var i = 0; i < self.data.letters.length; i++) {
      var letter = self.data.letters[i];
      var group = [];

      // 遍历联系人，按规则进行分组
      for (var j = 0; j < favorites.length; j++) {
        let contactItem = favorites[j];
        let contactName = contactItem.name;

        // 如果是中文，将其归类到 #
        let contactLetter = /^[\u4e00-\u9fa5]+$/.test(contactName[0]) 
          ? "#"  // 中文姓名归类到 #
          : contactName[0].toUpperCase();  // 英文名直接取首字母

        // 如果首字母匹配当前字母，加入该分组
        if (contactLetter === letter) {
          group.push(contactItem);  // 只保存联系人姓名和ID
        }
      }

      // 将分组添加到联系人列表
      if (group.length > 0) {
        contact.push({
          letter: letter,
          group: group
        });
      }
    }

    self.setData({
      contact: contact,
      filteredContacts: contact  // 初始时展示所有联系人
    });
  },

  onLoad: function () {
    this.loadContactsFromDatabase();  // 加载联系人姓名数据
    var screenHeight = wx.getSystemInfoSync().screenHeight;
    this.setData({
      screenHeight: screenHeight * 2,  // 可能需要根据设计调整适当的高度
    });
  },

  onTapScroll: function (e) {
    var loc = e.currentTarget.dataset.loc;  // 获取点击的字母
    this.setData({
      loc: loc  // 将该字母设置为 scroll-into-view 的目标
    });
  },

  // 导航到联系人详细信息页面
  navigateToContactDetail(e) {
    const contactId = e.currentTarget.dataset.id; // 获取联系人ID
    wx.navigateTo({
      url: `/pages/favoritecard/favoritecard?id=${contactId}`  // 跳转到 favoritecard 页面
    });
  },

});

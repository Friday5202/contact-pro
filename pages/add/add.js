// 初始化云开发
wx.cloud.init({
  env: 'friday-4g84qq5vab762cd2'  // 你的云开发环境 ID
});

const db = wx.cloud.database();  // 获取云数据库实例
const contactsCollection = db.collection('contacts');  // 指向 'contacts' 集合

Page({
  data: {
    name: '',
    phone: '',
    email: '',
    address: ''
  },

  // 输入框事件处理
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  onEmailInput(e) {
    this.setData({
      email: e.detail.value
    });
  },

  onAddressInput(e) {
    this.setData({
      address: e.detail.value
    });
  },

  // 保存联系人
  saveContact() {
    const { name, phone, email, address } = this.data;

    // 检查姓名和电话是否填写
    if (!name || !phone) {
      wx.showToast({
        title: '请填写必要的联系人信息',
        icon: 'none'
      });
      return;
    }

    // 将联系人信息保存到云数据库
    contactsCollection.add({
      data: {
        name: name,
        phone: phone,
        email: email,
        address: address
      },
      success: res => {
        wx.showToast({
          title: '联系人已保存',
        });

        // 保存成功后跳转到新的 index 页面
        wx.redirectTo({
          url: '/pages/index/index',  // 跳转到新的 index 页面
        });
      },
      fail: err => {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
        console.error('数据库添加失败：', err);
      }
    });
  }
});

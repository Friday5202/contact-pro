const ExcelJS = require('../../utils/exceljs.min.js');

// 初始化云开发
wx.cloud.init({
  env: 'friday-4g84qq5vab762cd2'  // 替换为你的云开发环境 ID
});

const db = wx.cloud.database();  // 获取云数据库实例
const contactsCollection = db.collection('contacts');  // 指向 'contacts' 集合

Page({
  data: {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ#",  // 字母表，包括 # 符号
    contact: [],  // 用于存储原始联系人姓名
    filteredContacts: [],  // 用于存储筛选后的联系人
    loc: "",
    screenHeight: 0,
    searchTerm: ""  // 存储搜索框中的内容
  },

  // 从云数据库中获取联系人姓名
  loadContactsFromDatabase() {
    let self = this;
    contactsCollection.field({
      name: true,
      _id: true
    }).get({
      success: res => {
        let contacts = res.data;
        self.arrangeContact(contacts);
      },
      fail: err => {
        console.error('从数据库获取联系人失败：', err);
      }
    });
  },

  // 整理通讯录，中文姓名归类到 #，英文姓名按首字母分组
  arrangeContact(contacts) {
    var self = this;
    var contact = [];

    for (var i = 0; i < self.data.letters.length; i++) {
      var letter = self.data.letters[i];
      var group = [];

      for (var j = 0; j < contacts.length; j++) {
        let contactItem = contacts[j];
        let contactName = contactItem.name;

        // 中文姓名归类到 #
        let contactLetter = /^[\u4e00-\u9fa5]+$/.test(contactName[0]) 
          ? "#"  
          : contactName[0].toUpperCase(); 

        if (contactLetter === letter) {
          group.push(contactItem);
        }
      }

      contact.push({
        letter: letter,
        group: group
      });
    }

    self.setData({
      contact: contact,
      filteredContacts: contact
    });
  },

  // 监听搜索框输入事件，实时筛选联系人
  onSearchInput: function (e) {
    const searchTerm = e.detail.value.toLowerCase();  
    this.setData({
      searchTerm: searchTerm
    });

    this.filterContacts();
  },

  // 根据搜索框内容筛选联系人
  filterContacts: function () {
    const self = this;
    const searchTerm = self.data.searchTerm;

    if (!searchTerm) {
      self.setData({
        filteredContacts: self.data.contact
      });
      return;
    }

    const filteredContacts = self.data.contact.map(group => {
      const filteredGroup = group.group.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm)
      );
      return {
        letter: group.letter,
        group: filteredGroup
      };
    }).filter(group => group.group.length > 0);

    self.setData({
      filteredContacts: filteredContacts
    });
  },

  onLoad: function () {
    this.loadContactsFromDatabase();  
    var screenHeight = wx.getSystemInfoSync().screenHeight;
    this.setData({
      screenHeight: screenHeight * 2,
    });
  },

  onTapScroll: function (e) {
    var loc = e.currentTarget.dataset.loc;  
    this.setData({
      loc: loc  
    });
  },

  onAddContact() {
    wx.navigateTo({
      url: '/pages/add/add'  
    });
  },

  // 导航到 favorite 页面
  onNavigateToFavorites: function() {
    wx.navigateTo({
      url: '/pages/favorite/favorite'  
    });
  },

  // 导出联系人数据
  onExportContacts: async function () {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('联系人');
    worksheet.addRow(['姓名']);

    try {
      const res = await contactsCollection.get();
      const contacts = res.data;

      contacts.forEach(contact => {
        worksheet.addRow([contact.name]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileSystemManager = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/contacts.xlsx`;

      // 注意：这里使用 'utf-8'，不使用 'binary' 编码
      await fileSystemManager.writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'utf-8',  // 保持 utf-8 编码
      });

      wx.showToast({
        title: '导出成功',
        icon: 'success'
      });
      wx.openDocument({
        filePath: filePath,
        fileType: 'xlsx',
        success: function (res) {
          console.log('文件打开成功');
        }
      });
      
    } catch (err) {
      console.error('导出失败：', err);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  },

  // 导入联系人数据
  onImportContacts: function () {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        const fileSystemManager = wx.getFileSystemManager();
        fileSystemManager.readFile({
          filePath: filePath,
          encoding: 'base64',
          success: (fileRes) => {
            const data = wx.base64ToArrayBuffer(fileRes.data);
            const workbook = new ExcelJS.Workbook();
            workbook.xlsx.load(data).then(() => {
              const worksheet = workbook.getWorksheet(1); // 获取第一个工作表
              const jsonData = [];

              worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                  const rowData = {
                    name: row.getCell(1).value  // 假设第一列是姓名
                  };
                  jsonData.push(rowData);
                }
              });

              const importPromises = jsonData.map(contact => {
                return contactsCollection.add({
                  data: {
                    name: contact.name 
                  }
                });
              });

              Promise.all(importPromises).then(() => {
                wx.showToast({
                  title: '导入成功',
                  icon: 'success'
                });
                this.loadContactsFromDatabase(); // 重新加载数据
              }).catch(err => {
                console.error('导入失败：', err);
                wx.showToast({
                  title: '导入失败',
                  icon: 'none'
                });
              });

            }).catch(err => {
              console.error('文件读取失败：', err);
              wx.showToast({
                title: '文件读取失败',
                icon: 'none'
              });
            });
          },
          fail: (err) => {
            console.error('文件选择失败：', err);
            wx.showToast({
              title: '文件选择失败',
              icon: 'none'
            });
          }
        });
      }
    });
  }
});

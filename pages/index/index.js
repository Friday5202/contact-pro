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
    contact: [],  // 存储原始联系人姓名
    filteredContacts: [],  // 存储筛选后的联系人
    loc: "",
    screenHeight: 0,
    searchTerm: ""  // 存储搜索框中的内容
  },

  loadContactsFromDatabase() {
    contactsCollection.field({
      name: true,
      _id: true
    }).get({
      success: res => {
        let contacts = res.data;
        this.arrangeContact(contacts);
      },
      fail: err => {
        console.error('从数据库获取联系人失败：', err);
      }
    });
  },

  arrangeContact(contacts) {
    let contact = [];
    for (let letter of this.data.letters) {
      let group = contacts.filter(contactItem => {
        const contactName = contactItem.name;
        const contactLetter = /^[\u4e00-\u9fa5]+$/.test(contactName[0]) ? "#" : contactName[0].toUpperCase();
        return contactLetter === letter;
      });
      contact.push({ letter, group });
    }
    this.setData({ contact, filteredContacts: contact });
  },

  onSearchInput: function (e) {
    const searchTerm = e.detail.value.toLowerCase();
    this.setData({ searchTerm });
    this.filterContacts();
  },

  filterContacts: function () {
    const searchTerm = this.data.searchTerm;
    if (!searchTerm) {
      this.setData({ filteredContacts: this.data.contact });
      return;
    }
    const filteredContacts = this.data.contact.map(group => {
      const filteredGroup = group.group.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm)
      );
      return { letter: group.letter, group: filteredGroup };
    }).filter(group => group.group.length > 0);

    this.setData({ filteredContacts });
  },

  onLoad: function () {
    this.loadContactsFromDatabase();
    const screenHeight = wx.getSystemInfoSync().screenHeight;
    this.setData({ screenHeight: screenHeight * 2 });
  },

  onTapScroll: function (e) {
    const loc = e.currentTarget.dataset.loc;
    this.setData({ loc });
  },

  onAddContact() {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  onNavigateToFavorites: function () {
    wx.navigateTo({ url: '/pages/favorite/favorite' });
  },

  // 导出联系人数据
  onExportContacts: async function () {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('联系人');
    worksheet.addRow(['姓名', '电话', '邮箱', '地址', '备注']);  // 添加表头

    try {
      const res = await contactsCollection.get();
      const contacts = res.data;
      contacts.forEach(contact => {
        worksheet.addRow([contact.name, contact.phone, contact.email, contact.address, contact.note]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileSystemManager = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/contacts.xlsx`;

      await fileSystemManager.writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'binary'
      });

      wx.showToast({ title: '导出成功', icon: 'success' });
      
      // 使用 wx.saveFile 保存到用户指定位置
      wx.saveFile({
        tempFilePath: filePath,
        success: (res) => {
          console.log('文件保存成功', res.savedFilePath);
          wx.showToast({ title: '文件已保存', icon: 'success' });
        },
        fail: (err) => {
          console.error('文件保存失败：', err);
          wx.showToast({ title: '文件保存失败', icon: 'none' });
        }
      });

    } catch (err) {
      console.error('导出失败：', err);
      wx.showToast({ title: '导出失败', icon: 'none' });
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
              const worksheet = workbook.getWorksheet(1);  // 获取第一个工作表
              const jsonData = [];

              worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                  const rowData = { 
                    name: row.getCell(1).value,
                    phone: row.getCell(2).value,
                    email: row.getCell(3).value,
                    address: row.getCell(4).value,
                    note: row.getCell(5).value
                  };
                  jsonData.push(rowData);
                }
              });

              const importPromises = jsonData.map(contact =>
                contactsCollection.add({
                  data: contact
                })
              );

              Promise.all(importPromises).then(() => {
                wx.showToast({ title: '导入成功', icon: 'success' });
                this.loadContactsFromDatabase();  // 重新加载数据
              }).catch(err => {
                console.error('导入失败：', err);
                wx.showToast({ title: '导入失败', icon: 'none' });
              });

            }).catch(err => {
              console.error('文件读取失败：', err);
              wx.showToast({ title: '文件读取失败', icon: 'none' });
            });
          },
          fail: (err) => {
            console.error('文件选择失败：', err);
            wx.showToast({ title: '文件选择失败', icon: 'none' });
          }
        });
      }
    });
  }
});

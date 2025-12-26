const { contextBridge, ipcRenderer } = require('electron');





contextBridge.exposeInMainWorld('electronAPI', {
  database: {
    customers: {
      getAll: () => ipcRenderer.invoke('customers:getAll'),
      getPaginated: (page: any, pageSize: any, searchTerm: any, includeArchived: any) => ipcRenderer.invoke('customers:getPaginated', page, pageSize, searchTerm, includeArchived),
      search: (searchTerm: any, limit: any) => ipcRenderer.invoke('customers:search', searchTerm, limit),
      getById: (id: any) => ipcRenderer.invoke('customers:getById', id),
      create: (customer: any) => ipcRenderer.invoke('customers:create', customer),
      update: (id: any, customer: any) => ipcRenderer.invoke('customers:update', id, customer),
      delete: (id: any) => ipcRenderer.invoke('customers:delete', id),
      archive: (id: any, anonymize: any = false) => ipcRenderer.invoke('customers:archive', id, anonymize),
      unarchive: (id: any) => ipcRenderer.invoke('customers:unarchive', id),
      getCount: () => ipcRenderer.invoke('customers:getCount'),
      getRecent: (limit: any) => ipcRenderer.invoke('customers:getRecent', limit),
      getMonthlyComparison: () => ipcRenderer.invoke('customers:getMonthlyComparison'),
      deleteAll: () => ipcRenderer.invoke('customers:deleteAll')
    },
    products: {
      getAll: () => ipcRenderer.invoke('products:getAll'),
      getPaginated: (page: any, pageSize: any, searchTerm: any) => ipcRenderer.invoke('products:getPaginated', page, pageSize, searchTerm),
      search: (searchTerm: any, limit: any) => ipcRenderer.invoke('products:search', searchTerm, limit),
      getActive: () => ipcRenderer.invoke('products:getActive'),
      getById: (id: any) => ipcRenderer.invoke('products:getById', id),
      create: (product: any) => ipcRenderer.invoke('products:create', product),
      update: (id: any, product: any) => ipcRenderer.invoke('products:update', id, product),
      delete: (id: any) => ipcRenderer.invoke('products:delete', id),
      getCount: () => ipcRenderer.invoke('products:getCount'),
      getMonthlyComparison: () => ipcRenderer.invoke('products:getMonthlyComparison'),
      deleteAll: () => ipcRenderer.invoke('products:deleteAll')
    },
    sales: {
      getAll: () => ipcRenderer.invoke('sales:getAll'),
      getPaginated: (page: any, pageSize: any, searchTerm: any) => ipcRenderer.invoke('sales:getPaginated', page, pageSize, searchTerm),
      getPageNumber: (saleId: any, pageSize: any, searchTerm: any) => ipcRenderer.invoke('sales:getPageNumber', saleId, pageSize, searchTerm),

      search: (searchTerm: any, limit: any) => ipcRenderer.invoke('sales:search', searchTerm, limit),
      getById: (id: any) => ipcRenderer.invoke('sales:getById', id),
      getByCustomer: (customerId: any) => ipcRenderer.invoke('sales:getByCustomer', customerId),
      create: (saleData: any) => ipcRenderer.invoke('sales:create', saleData),
      update: (id: any, sale: any) => ipcRenderer.invoke('sales:update', id, sale),
      delete: (id: any) => ipcRenderer.invoke('sales:delete', id),
      getCount: () => ipcRenderer.invoke('sales:getCount'),
      getTotalRevenue: () => ipcRenderer.invoke('sales:getTotalRevenue'),
      getRecent: (limit: any) => ipcRenderer.invoke('sales:getRecent', limit),
      getSalesChartData: (days: any) => ipcRenderer.invoke('sales:getSalesChartData', days),
      getStatsComparison: () => ipcRenderer.invoke('sales:getStatsComparison'),
      getWithDetails: (id: any) => ipcRenderer.invoke('sales:getWithDetails', id),
      getOverdueSales: () => ipcRenderer.invoke('sales:getOverdueSales'),
      getOverdueSalesCount: () => ipcRenderer.invoke('sales:getOverdueSalesCount'),
      deleteAll: () => ipcRenderer.invoke('sales:deleteAll')
    },

    installments: {
      getBySale: (saleId: any) => ipcRenderer.invoke('installments:getBySale', saleId),
      getAll: () => ipcRenderer.invoke('installments:getAll'),
      getOverdue: () => ipcRenderer.invoke('installments:getOverdue'),
      getUpcoming: (limit: any) => ipcRenderer.invoke('installments:getUpcoming', limit),
      recordPayment: (installmentId: any, amount: any, paymentMethod: any, reference: any, paymentDate: any) => ipcRenderer.invoke('installments:recordPayment', installmentId, amount, paymentMethod, reference, paymentDate),
      applyLateFee: (installmentId: any, fee: any) => ipcRenderer.invoke('installments:applyLateFee', installmentId, fee),
      revertPayment: (installmentId: any, transactionId: any) => ipcRenderer.invoke('installments:revertPayment', installmentId, transactionId),
      create: (installment: any) => ipcRenderer.invoke('installments:create', installment),
      update: (id: any, data: any) => ipcRenderer.invoke('installments:update', id, data),
      markAsPaid: (id: any, paymentDate: any) => ipcRenderer.invoke('installments:markAsPaid', id, paymentDate),
      delete: (id: any) => ipcRenderer.invoke('installments:delete', id),
      deleteAll: () => ipcRenderer.invoke('installments:deleteAll')
    },
    saleItems: {
      getBySale: (saleId: any) => ipcRenderer.invoke('saleItems:getBySale', saleId),
      create: (saleItem: any) => ipcRenderer.invoke('saleItems:create', saleItem),
      getSalesForProduct: (productId: any) => ipcRenderer.invoke('saleItems:getSalesForProduct', productId),
      deleteAll: () => ipcRenderer.invoke('saleItems:deleteAll')
    },
    payments: {
      getBySale: (saleId: any) => ipcRenderer.invoke('payments:getBySale', saleId),
      create: (payment: any) => ipcRenderer.invoke('payments:create', payment),
      getOverdue: () => ipcRenderer.invoke('payments:getOverdue'),
      deleteAll: () => ipcRenderer.invoke('payments:deleteAll')
    },
    partners: {
      getAll: () => ipcRenderer.invoke('partners:getAll'),
      create: (partner: any) => ipcRenderer.invoke('partners:create', partner),
      update: (id: any, partner: any) => ipcRenderer.invoke('partners:update', id, partner),
      delete: (id: any) => ipcRenderer.invoke('partners:delete', id)
    },
    calendar: {
      getAll: () => ipcRenderer.invoke('calendar:getAll'),
      create: (event: any) => ipcRenderer.invoke('calendar:create', event),
      update: (id: any, event: any) => ipcRenderer.invoke('calendar:update', id, event),
      delete: (id: any) => ipcRenderer.invoke('calendar:delete', id)
    },
    invoices: {
      create: (invoice: any) => ipcRenderer.invoke('invoices:create', invoice),
      update: (id: any, invoice: any) => ipcRenderer.invoke('invoices:update', id, invoice),
      delete: (id: any) => ipcRenderer.invoke('invoices:delete', id),
      getBySaleId: (saleId: any) => ipcRenderer.invoke('invoices:getBySaleId', saleId),
      getAllWithDetails: () => ipcRenderer.invoke('invoices:getAllWithDetails'),
      getNextInvoiceNumber: () => ipcRenderer.invoke('invoices:getNextInvoiceNumber')
    },


    onChanged: (callback: any) => {
      const handler = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('database:changed', handler);
      return () => {
        ipcRenderer.removeListener('database:changed', handler);
      };
    }
  },


  cache: {
    getSize: () => ipcRenderer.invoke('cache:getSize'),
    clear: () => ipcRenderer.invoke('cache:clear')
  },


  backup: {
    save: (data: any) => ipcRenderer.invoke('backup:save', data),
    load: () => ipcRenderer.invoke('backup:load'),
    importCustomers: (customers: any) => ipcRenderer.invoke('backup:importCustomers', customers),
    importProducts: (products: any) => ipcRenderer.invoke('backup:importProducts', products),
    importSales: (sales: any) => ipcRenderer.invoke('backup:importSales', sales)
  },


  notifications: {
    list: (limit: any) => ipcRenderer.invoke('notifications:list', limit),
    markRead: (id: any) => ipcRenderer.invoke('notifications:markRead', id),
    markUnread: (id: any) => ipcRenderer.invoke('notifications:markUnread', id),
    delete: (id: any) => ipcRenderer.invoke('notifications:delete', id),
    deleteByMessageToday: (message: any) => ipcRenderer.invoke('notifications:deleteByMessageToday', message),
    deleteByKeyToday: (key: any) => ipcRenderer.invoke('notifications:deleteByKeyToday', key),
    clearAll: () => ipcRenderer.invoke('notifications:clearAll'),
    unarchive: (id: any) => ipcRenderer.invoke('notifications:unarchive', id),
    create: (message: any, type: any, key: any) => ipcRenderer.invoke('notifications:create', message, type, key),
    existsTodayWithMessage: (message: any) => ipcRenderer.invoke('notifications:existsTodayWithMessage', message),
    existsTodayWithKey: (key: any) => ipcRenderer.invoke('notifications:existsTodayWithKey', key),
    listArchived: (limit: any) => ipcRenderer.invoke('notifications:listArchived', limit),
    purgeArchived: () => ipcRenderer.invoke('notifications:purgeArchived'),
    onEvent: (callback: any) => {
      const handler = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('notifications:event', handler);
      return () => {
        ipcRenderer.removeListener('notifications:event', handler);
      };
    },
    onEventBatch: (callback: any) => {
      const handler = (_event: any, payloads: any) => callback(payloads);
      ipcRenderer.on('notifications:eventBatch', handler);
      return () => {
        ipcRenderer.removeListener('notifications:eventBatch', handler);
      };
    },
    emitTestEvent: (payload: any) => ipcRenderer.invoke('notifications:emitTestEvent', payload),
    snoozeUntil: (untilTs: any) => ipcRenderer.invoke('notifications:snoozeUntil', untilTs),
    clearSnooze: () => ipcRenderer.invoke('notifications:clearSnooze')
  },


  utils: {
    getDesktopPath: () => ipcRenderer.invoke('utils:getDesktopPath'),
    saveFile: (filePath: string, buffer: ArrayBuffer) => ipcRenderer.invoke('utils:saveFile', { filePath, buffer })
  },
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  showItemInFolder: (path: any) => ipcRenderer.invoke('show-item-in-folder', path),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  openPath: (path: any) => ipcRenderer.invoke('open-path', path),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onStateChange: (callback: any) => {
      const handler = (_event: any, state: any) => callback(state);
      ipcRenderer.on('window:state', handler);
      return () => ipcRenderer.removeListener('window:state', handler);
    }
  }
});

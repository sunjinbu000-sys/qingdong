const {page,service}=require('../../utils/page');page({data:{rank:{rows:[]}},refresh(){return this.loadData(async()=>{this.setData({rank:await service.getRank()});});}});

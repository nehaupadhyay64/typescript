import express from 'express'; import cors from 'cors'; import { createBullBoard } from '@bull-board/api'; import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'; import { ExpressAdapter } from '@bull-board/express'; import { config } from './config.js'; import { migrate } from './db.js'; import { emailQueue } from './queue.js'; import { ensureEmailIndex } from './es.js'; import { router } from './routes.js';
await migrate(); await ensureEmailIndex();
const app=express(); app.use(cors({origin:config.frontendUrl,credentials:true})); app.use(express.json()); app.use('/api',router);
const board=new ExpressAdapter(); board.setBasePath('/admin/queues'); createBullBoard({queues:[new BullMQAdapter(emailQueue)],serverAdapter:board}); app.use('/admin/queues',board.getRouter()); app.get('/health',(_req,res)=>res.json({ok:true}));
app.listen(config.port,()=>console.log(`API listening on ${config.port}`));

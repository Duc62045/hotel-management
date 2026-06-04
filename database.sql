-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: hotel_management
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `status` enum('pending','confirmed','checked_in','checked_out','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (2,3,2,'2026-04-23','2026-04-28',0.00,'checked_out','2026-04-23 06:33:47'),(3,2,1,'2026-04-23','2026-04-28',2500000.00,'cancelled','2026-04-23 07:26:14'),(4,5,2,'2026-04-24','2026-04-28',2000000.00,'pending','2026-04-24 03:30:41'),(5,7,1,'2026-05-06','2026-05-10',2000000.00,'checked_out','2026-05-06 03:59:19'),(6,8,1,'2026-05-06','2026-05-13',3500000.00,'checked_in','2026-05-06 06:45:38'),(7,8,3,'2026-05-06','2026-05-12',9000000.00,'cancelled','2026-05-06 07:08:47'),(8,7,3,'2026-05-06','2026-05-12',9000000.00,'checked_out','2026-05-06 07:11:56');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `encrypted_id_card` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,3,'Nguyen Thi B','0934235212','gAAAAABp6Y-LbBzNIlKY7vEtOa9nkj_zZfXzChm6NcIdmMooUDEdn_gQsM9sTY2lW9qdDEPwE8tJUwnDUyoXYq94q6QFUc5TnQ==','2026-04-23 03:18:35'),(2,3,'Pham Van C','0987654321','gAAAAABp6ZbOXJ4_fhmh4Q91Dw0yujIsg7c4mhAgvADGLrCby_auMJiXQXJ4LqR31aoWuciufNGlQ3F9Hyg8cqfz9_SSPH5c6Q==','2026-04-23 03:49:34'),(3,3,'Dinh Thi C','6543217890','gAAAAABp6bVtWlDmL_Iv9n36weIHMbYRTwrHwpX1gfJhbSfGAoreDrsP9ozitJc8JMmbGIZZdSqimrAXg_jcoKi7NQrS3IyFOA==','2026-04-23 06:00:13'),(4,4,'Nguyen Thi Lan Huong','1212909034','gAAAAABp6klr6173lTBGHtYQXSVxshAtNs4gZHfUslEC9gdJ2M0M7dXAf0l4wqScTuibZmD3YWnQjku9Mzc7HUQQTB7c52R_kw==','2026-04-23 16:31:39'),(5,3,'La La La','09423428932','gAAAAABp6uLuK90DXoxTy_AyJtftF-zgR9EkS26In4IFGsSMyGOPQrTIRQIPxbZGEGJGYk08JCVYffesVJ2TU7qllFrBHmrAQw==','2026-04-24 03:26:38'),(6,3,'Dinh Van T','892141532095','gAAAAABp6urdrGSxuuCW_k3l3seRGFMbsVsxqZrPpwH9oQkkAanUitpHLFRahP20WczhrPf7JJIqLRsQMBdFyMh0bMeI9kU7fQ==','2026-04-24 04:00:29'),(7,10,'Vu Dinh Cong','0387892389','gAAAAABp-ryJ7dSiqPmzaiteSmJ3VETy59xdWYz_00TS79dRcd_Z1WXEpia2PfafddR9zKqcBv5u4Oo3_dyM7H7JaOEWdPrHcw==','2026-05-06 03:59:05'),(8,9,'Trinh Thi Cho','0981237891','gAAAAABp-uOJbqv031xB5297x15Y2qg38G18cOLrJiV6D7t5rKGVhh6-lYIztv3a06dvGMaQbMISAYiF398fASsnt8qZkUH-3Q==','2026-05-06 06:45:29');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Admin','Quản trị viên hệ thống'),(2,'Customer','Khách hàng đặt phòng');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  `price_per_night` decimal(10,2) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room_types`
--

LOCK TABLES `room_types` WRITE;
/*!40000 ALTER TABLE `room_types` DISABLE KEYS */;
INSERT INTO `room_types` VALUES (1,'Standard',500000.00,'Phòng tiêu chuẩn 1 giường đôi'),(2,'VIP',1500000.00,'Phòng VIP view biển'),(3,'Suite',3000000.00,'Phòng Tổng thống cao cấp nhất');
/*!40000 ALTER TABLE `room_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_number` varchar(10) NOT NULL,
  `type_id` int DEFAULT NULL,
  `status` enum('available','booked','cleaning','maintenance') DEFAULT 'available',
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_number` (`room_number`),
  KEY `type_id` (`type_id`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`type_id`) REFERENCES `room_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rooms`
--

LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (1,'101',1,'booked'),(2,'102',1,'booked'),(3,'103',2,'available'),(4,'104',2,'available'),(5,'105',2,'available'),(6,'106',2,'available');
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'quanh','$2b$12$I2jI3084Z5GSD.I5lSoAHO25HH7gEwyrCrQ7jci7qBH8Ii8weSLcG','user@example.com','Nguyen Van A',1,'2026-04-22 15:52:50'),(3,'long','$2b$12$6TPWj8j0.SWGFlpWGpvDoOw.Haen1JBlc8ZZPs3Y5bEmDuCR2o/Hu','long@example.com','Nguyen Dinh Long',1,'2026-04-22 16:17:25'),(4,'nguoidung4','$2b$12$N.pXLNg3QBB5f9q80FZyQOKhQHxjkjKXfHZSzmGyBaWi7xoMOfGBe','quanly@example.com','Tran Dinh D',1,'2026-04-23 16:27:12'),(5,'testdemo','$2b$12$tw08J3mLFMFNZuqf3VPYDuTCJYja3QE1aozkh0pnSvwMCE9xv5/8G','testdemo@example.com','Vo Dinh B',1,'2026-04-24 03:20:11'),(6,'test','$2b$12$S8LEGtQjSQ.DqAPYkBgMeOz3dY2jHHlMe.Lmev9k0aV0YbTjA3Jfe','testuser@example.com','Nguyen Thanh C',1,'2026-04-24 03:56:47'),(8,'quanly','$2b$12$qNEVucUgwhZlGmUXKdg/RuTW6ZDVkc5lzzrDFTVmB8wphINhr8C.O','quanly2@example.com','Tran Van Ly',1,'2026-05-06 03:11:14'),(9,'nguoidung2','$2b$12$M9lFmo9N65yr83M.wf.SUOD2FAhLWFo9CvTx.FSaJSswThufvzEW6','nguoidung22@example.com','Hoang Van Dinh Long',2,'2026-05-06 03:13:02'),(10,'nguoidung3','$2b$12$Ylrtkea.BRO3sdTE5BNpgOn0mc.BQqdtP7NxqFXc73/xHfbaZ8N2y','nguoidung3@example.com','Nguyen Thi Huong',2,'2026-05-06 03:23:42');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-08 10:28:11

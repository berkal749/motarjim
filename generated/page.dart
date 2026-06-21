import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
    AppBar(
        title: Text("Title"),
      ),
    Column(
        children: [
    Container(
          padding: 0,
          margin: 0,
          textAlign: "center",
          color: "white",
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          boxSizing: "border-box",
          child: Column(
            children: [
    Text("Welcome to My App A modern application built with the best technologies."),
    ElevatedButton(
            onPressed: () {},
            child: Text("Get Started"),
          ),
            ],
          ),
        ),
        ],
      ),
    Column(
        children: [
    Card(
          child: Text("Fast Lightning fast performance"),
        ),
        ],
      ),
    Form(
        child: Column(
          children: [
    Text("Contact Us"),
    TextField(
          decoration: InputDecoration(
            border: OutlineInputBorder(),
          ),
        ),
    TextField(
          decoration: InputDecoration(
            border: OutlineInputBorder(),
          ),
        ),
    SizedBox.shrink(),
    ElevatedButton(
          onPressed: () {},
          child: Text("Send Message"),
        ),
          ],
        ),
      ),
    Container(
        child: Column(
          children: [
    Text("© 2026 My App. All rights reserved."),
          ],
        ),
      ),
        ],
      ),
    );
  }
}
